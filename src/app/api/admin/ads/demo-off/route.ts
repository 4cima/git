/**
 * /api/admin/ads/demo-off — one-click deactivation of all demo/example.com ads.
 * Runs ONLY from the admin panel (never from a script):
 *   UPDATE ads SET active = 0 WHERE title LIKE '%تجريبي%' OR content LIKE '%example.com%'
 * Returns how many rows were turned off. no-store.
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
    const r = await executeAll<any>(
      `UPDATE ads SET active = 0
       WHERE title LIKE '%تجريبي%' OR content LIKE '%example.com%'`,
    ) as any
    return NextResponse.json(
      { success: true, disabled: r?.meta?.changes ?? 0, message: 'All demo/example.com ads disabled' },
      { headers: NO_STORE },
    )
  } catch (error) {
    console.error('demo-off error:', error)
    return NextResponse.json({ error: 'Failed to disable demo ads' }, { status: 500, headers: NO_STORE })
  }
}