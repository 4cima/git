/**
 * /api/admin/ads/demo-off — تعطيل كل الإعلانات التجريبية/example.com بضغطة واحدة.
 * تشتغل من اللوحة فقط: UPDATE ads SET active = 0 WHERE title LIKE '%تجريبي%' OR content LIKE '%example.com%'.
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
    const r = (await executeAll<Record<string, unknown>>(
      `UPDATE ads SET active = 0 WHERE title LIKE '%تجريبي%' OR content LIKE '%example.com%'`,
    )) as { meta?: { changes?: number } }
    return NextResponse.json(
      { ok: true, disabled: r?.meta?.changes ?? 0, message: 'كل الإعلانات التجريبية معطلة' },
      { headers: NO_STORE },
    )
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل تعطيل الإعلانات التجريبية' }, { status: 500, headers: NO_STORE })
  }
}
