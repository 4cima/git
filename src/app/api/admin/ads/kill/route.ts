/**
 * /api/admin/ads/kill — قاطع الطوارئ: إيقاف كل الشبكات أو شبكة واحدة فورًا.
 * الإيقاف = status→paused على ad_providers؛ serve يشترط p.status='active' فتتوقف فورًا.
 */
import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = ((await request.json().catch(() => null)) as { provider_id?: unknown } | null)
    const providerId = body && typeof body.provider_id === 'number' ? body.provider_id : null

    let affected = 0
    try {
      if (providerId && Number.isInteger(providerId) && providerId > 0) {
        const provider = await executeAll<{ id: number }>('SELECT id FROM ad_providers WHERE id = ?', [providerId])
        if (provider.length === 0)
          return NextResponse.json({ ok: false, error: 'الشبكة غير موجودة' }, { status: 404, headers: NO_STORE })
        await executeAll(`UPDATE ad_providers SET status = 'paused', updated_at = datetime('now') WHERE id = ?`, [providerId])
        affected = 1
      } else {
        const r = (await executeAll<Record<string, unknown>>(
          `UPDATE ad_providers SET status = 'paused', updated_at = datetime('now')`,
        )) as { meta?: { changes?: number } }
        affected = r?.meta?.changes ?? 0
      }
    } catch (err) {
      if ((err as Error).message.includes('no such table'))
        return NextResponse.json({ ok: false, error: 'جداول الوساطة غير منشأة بعد' }, { status: 409, headers: NO_STORE })
      throw err
    }

    return NextResponse.json(
      { ok: true, paused: affected, message: 'تم التطبيق — الشبكات توقفت فورًا' },
      { headers: NO_STORE },
    )
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل تطبيق قاطع الطوارئ' }, { status: 500, headers: NO_STORE })
  }
}
