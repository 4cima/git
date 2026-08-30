/**
 * /api/admin/ads/providers — Admin CRUD for ad providers (presets).
 * Protected by middleware (/api/admin/*) + requireAdmin (double guard).
 * Killing a provider (status -> paused) stops it instantly in serve:
 * the serve query requires p.status = 'active'. no-store.
 */
import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

const PRESET_SLUGS = [
  'propellerads', 'adsterra', 'exoclick', 'popads',
  'popcash', 'hilltopads', 'trafficstars', 'custom',
]

// GET — list providers (and note if the mediation tables are missing yet)
export async function GET() {
  try {
    const providers = await executeAll<any>(
      `SELECT id, name, slug, status, notes, created_at, updated_at
       FROM ad_providers ORDER BY id ASC`,
    )
    return NextResponse.json({ data: providers, migrated: true }, { headers: NO_STORE })
  } catch (error) {
    console.warn('providers GET (may be pre-migration):', (error as Error).message)
    return NextResponse.json({ data: [], migrated: false }, { headers: NO_STORE })
  }
}

const VALID_SLUGS = new Set(PRESET_SLUGS)

// POST — create a provider (usually only the presets; custom networks allowed)
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json() as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
    const status = body.status === 'active' ? 'active' : 'paused'
    const notes = typeof body.notes === 'string' && body.notes ? body.notes : null

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400, headers: NO_STORE })
    }
    if (VALID_SLUGS.has(slug)) {
      return NextResponse.json({ error: `slug "${slug}" is a reserved preset — use the Custom provider instead` }, { status: 400, headers: NO_STORE })
    }
    // preserve presets that were seeded by the migration
    try {
      await executeAll(
        `INSERT INTO ad_providers (name, slug, status, notes) VALUES (?, ?, ?, ?)`,
        [name, slug, status, notes],
      )
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('UNIQUE')) {
        return NextResponse.json({ error: 'A provider with this slug already exists' }, { status: 400, headers: NO_STORE })
      }
      return NextResponse.json({ error: 'mediation tables not migrated yet' }, { status: 409, headers: NO_STORE })
    }

    return NextResponse.json({ success: true, message: 'Provider created' }, { status: 201, headers: NO_STORE })
  } catch (error) {
    console.error('providers POST error:', error)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500, headers: NO_STORE })
  }
}

// PUT — update provider (status: active|paused = kill switch, and/or notes)
export async function PUT(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json() as Record<string, unknown>
    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Valid id required' }, { status: 400, headers: NO_STORE })
    }

    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (body.status !== undefined) {
      const status = String(body.status)
      if (status !== 'active' && status !== 'paused') {
        return NextResponse.json({ error: 'status must be active or paused' }, { status: 400, headers: NO_STORE })
      }
      updates.push('status = ?'); values.push(status)
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?'); values.push(body.notes ? String(body.notes) : null)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: NO_STORE })
    }

    try {
      updates.push("updated_at = datetime('now')")
      await executeAll(`UPDATE ad_providers SET ${updates.join(', ')} WHERE id = ?`, [...values, id])
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table')) {
        return NextResponse.json({ error: 'mediation tables not migrated yet' }, { status: 409, headers: NO_STORE })
      }
      // updated_at may not exist — retry without it
      const base = updates.filter((u) => !u.startsWith('updated_at'))
      await executeAll(`UPDATE ad_providers SET ${base.join(', ')} WHERE id = ?`, [...values.slice(0, base.length), id])
    }

    return NextResponse.json({ success: true, message: 'Provider updated (kill switch applied instantly)' }, { headers: NO_STORE })
  } catch (error) {
    console.error('providers PUT error:', error)
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500, headers: NO_STORE })
  }
}