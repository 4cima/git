import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { turso } from '@/lib/turso'

// Command whitelist - only these commands are allowed
const ALLOWED_COMMANDS: Record<string, { cmd: string; args: string[]; risk: 'low' | 'medium' | 'high' }> = {
  // Core Workflow
  'npm run download-ids': { cmd: 'npm', args: ['run', 'download-ids'], risk: 'low' },
  'npm run fetch': { cmd: 'npm', args: ['run', 'fetch'], risk: 'low' },
  'npm run enrich': { cmd: 'npm', args: ['run', 'enrich'], risk: 'low' },
  'npm run sync': { cmd: 'npm', args: ['run', 'sync'], risk: 'medium' },
  'npm run full-workflow': { cmd: 'npm', args: ['run', 'full-workflow'], risk: 'medium' },
  'npm run setup': { cmd: 'npm', args: ['run', 'setup'], risk: 'medium' },
  
  // Content Quality (Low Risk - Read-only)
  'node scripts/check-local-data.js': { cmd: 'node', args: ['scripts/check-local-data.js'], risk: 'low' },
  'node scripts/check-turso-data.js': { cmd: 'node', args: ['scripts/check-turso-data.js'], risk: 'low' },
  'node scripts/verify-sync-quality.js': { cmd: 'node', args: ['scripts/verify-sync-quality.js'], risk: 'low' },
  'node scripts/health-check.js': { cmd: 'node', args: ['scripts/health-check.js'], risk: 'low' },
  'node scripts/check-schema.js': { cmd: 'node', args: ['scripts/check-schema.js'], risk: 'low' },
  'node scripts/check-tables.js': { cmd: 'node', args: ['scripts/check-tables.js'], risk: 'low' },
  'node scripts/monitoring-dashboard.js': { cmd: 'node', args: ['scripts/monitoring-dashboard.js'], risk: 'low' },
  
  // Database Admin (High Risk - Destructive)
  'node scripts/0-reset-and-apply-schema.js': { cmd: 'node', args: ['scripts/0-reset-and-apply-schema.js'], risk: 'high' },
  'node scripts/dump-schema.js': { cmd: 'node', args: ['scripts/dump-schema.js'], risk: 'low' },
  
  // Translation (Medium Risk - Bulk Updates)
  'node scripts/translate-missing-titles.js': { cmd: 'node', args: ['scripts/translate-missing-titles.js'], risk: 'medium' },
  'node scripts/translate-missing-overviews.js': { cmd: 'node', args: ['scripts/translate-missing-overviews.js'], risk: 'medium' },
  'node scripts/complete-translations.js': { cmd: 'node', args: ['scripts/complete-translations.js'], risk: 'medium' },
}

/**
 * POST /api/admin/operations
 * Execute a whitelisted command and stream output via SSE
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, confirm } = body

    // Check operations password
    const opsPassword = request.headers.get('x-operations-password')
    if (opsPassword !== process.env.OPERATIONS_PANEL_PASSWORD) {
      return NextResponse.json({ error: 'Invalid operations password' }, { status: 403 })
    }

    // Validate command is whitelisted
    const commandConfig = ALLOWED_COMMANDS[action]
    if (!commandConfig) {
      return NextResponse.json({ error: 'Command not allowed' }, { status: 400 })
    }

    // Require confirmation for high-risk operations
    if (commandConfig.risk === 'high' && !confirm) {
      return NextResponse.json({ error: 'Confirmation required for high-risk operation' }, { status: 400 })
    }

    // Get authenticated user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get username from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    const username = profile?.username || user.email || 'unknown'

    // Create log entry
    const logResult = await turso.execute({
      sql: 'INSERT INTO operations_log (user_id, username, command, exit_code) VALUES (?, ?, ?, NULL) RETURNING id',
      args: [user.id, username, action],
    })

    const logId = Number(logResult.rows[0].id)

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const startTime = Date.now()
        let stdoutBuffer = ''
        let stderrBuffer = ''

        // Send start event
        controller.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({ logId, timestamp: new Date().toISOString() })}\n\n`))

        // Spawn process
        const child = spawn(commandConfig.cmd, commandConfig.args, {
          cwd: process.cwd(),
          env: { ...process.env },
          shell: true,
        })

        // Stream stdout
        child.stdout.on('data', (data) => {
          const text = data.toString()
          stdoutBuffer += text
          controller.enqueue(encoder.encode(`event: stdout\ndata: ${JSON.stringify({ line: text })}\n\n`))
        })

        // Stream stderr
        child.stderr.on('data', (data) => {
          const text = data.toString()
          stderrBuffer += text
          controller.enqueue(encoder.encode(`event: stderr\ndata: ${JSON.stringify({ line: text })}\n\n`))
        })

        // Handle exit
        child.on('close', async (code) => {
          const duration = Math.floor((Date.now() - startTime) / 1000)
          
          // Update log entry
          await turso.execute({
            sql: 'UPDATE operations_log SET exit_code = ?, duration_seconds = ?, stdout_preview = ?, stderr_preview = ? WHERE id = ?',
            args: [
              code,
              duration,
              stdoutBuffer.slice(0, 1000),
              stderrBuffer.slice(0, 1000),
              logId,
            ],
          })

          // Send exit event
          controller.enqueue(encoder.encode(`event: exit\ndata: ${JSON.stringify({ code, duration })}\n\n`))
          controller.close()
        })

        // Handle errors
        child.on('error', async (error) => {
          const duration = Math.floor((Date.now() - startTime) / 1000)
          
          await turso.execute({
            sql: 'UPDATE operations_log SET exit_code = ?, duration_seconds = ?, stderr_preview = ? WHERE id = ?',
            args: [1, duration, error.message, logId],
          })

          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`))
          controller.close()
        })
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: unknown) {
    console.error('Error executing operation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/operations
 * Get operations log history
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Number(searchParams.get('limit')) || 50

    const result = await turso.execute({
      sql: 'SELECT * FROM operations_log ORDER BY timestamp DESC LIMIT ?',
      args: [limit],
    })

    return NextResponse.json({ ok: true, logs: result.rows })
  } catch (error: unknown) {
    console.error('Error fetching operations log:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
