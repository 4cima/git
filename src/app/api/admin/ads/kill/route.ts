/**
 * /api/admin/ads/kill — Instant kill switch for all zones or one network.
 * Pauses providers (or one provider) so /api/ads/serve immediately returns
 * no network ads (serve requires p.status = 'active', no cache).
 */
import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

type ProviderRow = { id: number }

// POST /api/admin/ads/kill  body: { provider_id?: number } (empty = all)
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json().catch(() => null) as { provider_id?: unknown } | null
    const providerId = body && typeof body.provider_id === 'number' ? body.provider_id : null

    let affected = 0
    try {
      if (providerId && Number.isInteger(providerId) && providerId > 0) {
        const provider = await executeAll<ProviderRow>(
          'SELECT id FROM ad_providers WHERE id = ?',
          [providerId],
        )
        if (provider.length === 0) {
          return NextResponse.json({ error: 'Provider not found' }, { status: 404, headers: NO_STORE })
        }
        const r = await executeAll<any>(
          `UPDATE ad_providers SET status = 'paused', updated_at = datetime('now') WHERE id = ?`,
          [providerId],
        ) as any
        affected = r?.meta?.changes ?? 1
      } else {
        // all networks off
        const r = await executeAll<any>(
          `UPDATE ad_providers SET status = 'paused', updated_at = datetime('now')`,
        ) as any
        affected = r?.meta?.changes ?? 1
      }
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table')) {
        return NextResponse.json({ error: 'mediation tables not migrated yet' }, { status: 409, headers: NO_STORE })
      }
      throw err
    }

    return NextResponse.json(
      { success: true, paused: affected, message: 'Kill switch applied — networks stopped instantly' },
      { headers: NO_STORE },
    )
  } catch (error) {
    console.error('kill error:', error)
    return NextResponse.json({ error: 'Failed to apply kill switch' }, { status: 500, headers: NO_STORE })
  }
}