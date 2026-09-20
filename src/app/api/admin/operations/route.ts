/**
 * /api/admin/operations — تشغيل أوامر صيانة من allowlist ثابت + سجل عمليات.
 * POST: ثلاث طبقات حماية (requireAdmin + كلمة سر x-operations-password بـsafeEqual +
 *       جلسة مستخدم) — والأوامر نفسها من قائمة ثابتة بلا shell (shell:false).
 *       ⚠️ spawn لا يعمل على Workers — هذا المسار مصمم للتشغيل المحلي/بيئة Node.
 * GET: سجل العمليات (LIMIT بحد أقصى 200).
 */
import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { executeAll } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-server'
import { requireAdmin } from '@/lib/requireAdmin'
import { safeEqual } from '@/lib/timingSafeEqual'

export const dynamic = 'force-dynamic'

const ALLOWED_COMMANDS: Record<string, { cmd: string; args: string[]; risk: 'low' | 'medium' | 'high' }> = {
  'npm run download-ids':     { cmd: 'npm',  args: ['run', 'download-ids'],                  risk: 'low' },
  'npm run fetch':            { cmd: 'npm',  args: ['run', 'fetch'],                          risk: 'low' },
  'npm run enrich':           { cmd: 'npm',  args: ['run', 'enrich'],                         risk: 'low' },
  'npm run sync':             { cmd: 'npm',  args: ['run', 'sync'],                           risk: 'medium' },
  'npm run full-workflow':    { cmd: 'npm',  args: ['run', 'full-workflow'],                  risk: 'medium' },
  'npm run setup':            { cmd: 'npm',  args: ['run', 'setup'],                          risk: 'medium' },
  'node scripts/check-local-data.js':              { cmd: 'node', args: ['scripts/check-local-data.js'],              risk: 'low' },
  'node scripts/health-check.js':                  { cmd: 'node', args: ['scripts/health-check.js'],                  risk: 'low' },
  'node scripts/check-schema.js':                  { cmd: 'node', args: ['scripts/check-schema.js'],                  risk: 'low' },
  'node scripts/monitoring-dashboard.js':          { cmd: 'node', args: ['scripts/monitoring-dashboard.js'],          risk: 'low' },
  'node scripts/dump-schema.js':                   { cmd: 'node', args: ['scripts/dump-schema.js'],                   risk: 'low' },
  'node scripts/translate-missing-titles.js':      { cmd: 'node', args: ['scripts/translate-missing-titles.js'],      risk: 'medium' },
  'node scripts/translate-missing-overviews.js':   { cmd: 'node', args: ['scripts/translate-missing-overviews.js'],   risk: 'medium' },
  'node scripts/complete-translations.js':         { cmd: 'node', args: ['scripts/complete-translations.js'],         risk: 'medium' },
}

export async function POST(request: NextRequest) {
  try {
    const { action, confirm } = await request.json()

    // الطبقة 1: حارس الإدارة (نفس باقي الـAPIs)
    const denied = await requireAdmin(request)
    if (denied) return denied

    // الطبقة 2: كلمة سر العمليات
    const opsPassword = request.headers.get('x-operations-password') ?? ''
    const passwordOk = await safeEqual(opsPassword, process.env.OPERATIONS_PANEL_PASSWORD ?? '')
    if (!passwordOk)
      return NextResponse.json({ error: 'كلمة سر العمليات غير صحيحة' }, { status: 403 })

    // الطبقة 3: أمر مسموح فقط
    const commandConfig = ALLOWED_COMMANDS[action]
    if (!commandConfig) return NextResponse.json({ error: 'أمر غير مسموح' }, { status: 400 })

    if (commandConfig.risk === 'high' && !confirm)
      return NextResponse.json({ error: 'الأوامر عالية الخطورة تحتاج تأكيدًا' }, { status: 400 })

    // الطبقة 4: هوية المستخدم للسجل
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'غير مصدّق' }, { status: 401 })

    const username = user.name || user.email || 'unknown'

    const logRows = await executeAll(
      'INSERT INTO operations_log (user_id, username, command, exit_code) VALUES (?, ?, ?, NULL) RETURNING id',
      [user.id, username, action],
    )
    const logId = Number((logRows[0] as Record<string, unknown>)?.id)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const startTime = Date.now()
        let stdoutBuffer = '', stderrBuffer = ''

        controller.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({ logId, timestamp: new Date().toISOString() })}\n\n`))

        // shell:false — الأمر ووسائطه من قائمة ثابتة، لا سطح لحقن الشل
        const child = spawn(commandConfig.cmd, commandConfig.args, { cwd: process.cwd(), env: { ...process.env }, shell: false })

        child.stdout.on('data', (data) => {
          const text = data.toString()
          stdoutBuffer += text
          controller.enqueue(encoder.encode(`event: stdout\ndata: ${JSON.stringify({ line: text })}\n\n`))
        })
        child.stderr.on('data', (data) => {
          const text = data.toString()
          stderrBuffer += text
          controller.enqueue(encoder.encode(`event: stderr\ndata: ${JSON.stringify({ line: text })}\n\n`))
        })
        child.on('close', async (code) => {
          const duration = Math.floor((Date.now() - startTime) / 1000)
          await executeAll(
            'UPDATE operations_log SET exit_code=?, duration_seconds=?, stdout_preview=?, stderr_preview=? WHERE id=?',
            [code, duration, stdoutBuffer.slice(0, 1000), stderrBuffer.slice(0, 1000), logId],
          )
          controller.enqueue(encoder.encode(`event: exit\ndata: ${JSON.stringify({ code, duration })}\n\n`))
          controller.close()
        })
        child.on('error', async (error) => {
          const duration = Math.floor((Date.now() - startTime) / 1000)
          await executeAll('UPDATE operations_log SET exit_code=?, duration_seconds=?, stderr_preview=? WHERE id=?', [1, duration, error.message, logId])
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`))
          controller.close()
        })
      },
    })

    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'خطأ غير معروف' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const parsed = Number.parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
    const limit = Number.isFinite(parsed) ? Math.min(200, Math.max(1, parsed)) : 50
    const logs = await executeAll('SELECT * FROM operations_log ORDER BY timestamp DESC LIMIT ?', [limit])
    return NextResponse.json({ ok: true, logs, limit })
  } catch (error: unknown) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500 })
  }
}
