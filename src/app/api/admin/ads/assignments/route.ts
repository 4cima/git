/**
 * /api/admin/ads/assignments — Admin CRUD for slot↔zone assignments (waterfall).
 * Waterfall ordering is by priority ASC then weighted random within a priority.
 */
import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

const VALID_SLOTS = ['home-after-hero', 'details-below-player', 'watch-preroll', 'watch-midroll', 'global-popunder']
const DEVICES = ['all', 'mobile', 'desktop']

// GET — list assignments with zone/provider context + all slots
export async function GET() {
  try {
    const assignments = await executeAll<any>(
      `SELECT a.id, a.slot_key, a.zone_id, a.priority, a.weight, a.device,
              a.start_at, a.end_at, a.frequency_cap, a.frequency_hours, a.active,
              z.name AS zone_name, z.type AS zone_type,
              p.name AS provider_name, p.slug AS provider_slug,
              p.status AS provider_status
       FROM ad_slot_assignments a
       JOIN ad_zones z ON z.id = a.zone_id
       JOIN ad_providers p ON p.id = z.provider_id
       ORDER BY a.slot_key ASC, a.priority ASC, a.id ASC`,
    )
    let slots: any[] = []
    try {
      slots = await executeAll<any>('SELECT id, slot_key, name, types, page_scope FROM ad_slots ORDER BY id ASC')
    } catch { /* slots may be missing — return empty */ }
    return NextResponse.json({ data: assignments, slots, migrated: true }, { headers: NO_STORE })
  } catch (error) {
    console.warn('assignments GET (may be pre-migration):', (error as Error).message)
    return NextResponse.json({ data: [], slots: [], migrated: false }, { headers: NO_STORE })
  }
}

// POST — create assignment
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json() as Record<string, unknown>
    const slotKey = typeof body.slot_key === 'string' ? body.slot_key : ''
    const zoneId = Number(body.zone_id)
    const priority = Number(body.priority)
    const weight = Number(body.weight)
    const device = typeof body.device === 'string' && body.device ? body.device : 'all'
    const active = body.active ? 1 : 1 // assignments default to active
    const startAt = typeof body.start_at === 'string' && body.start_at ? body.start_at : null
    const endAt = typeof body.end_at === 'string' && body.end_at ? body.end_at : null
    const freqCap = Number(body.frequency_cap)
    const freqHours = Number(body.frequency_hours)

    if (!VALID_SLOTS.includes(slotKey)) {
      return NextResponse.json({ error: `slot_key must be one of: ${VALID_SLOTS.join(', ')}` }, { status: 400, headers: NO_STORE })
    }
    if (!Number.isInteger(zoneId) || zoneId <= 0) {
      return NextResponse.json({ error: 'Valid zone_id required' }, { status: 400, headers: NO_STORE })
    }
    if (!DEVICES.includes(device)) {
      return NextResponse.json({ error: `device must be one of: ${DEVICES.join(', ')}` }, { status: 400, headers: NO_STORE })
    }

    try {
      await executeAll(
        `INSERT INTO ad_slot_assignments
           (slot_key, zone_id, priority, weight, device, start_at, end_at, frequency_cap, frequency_hours, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slotKey, zoneId,
          Number.isFinite(priority) && priority > 0 ? priority : 1,
          Number.isFinite(weight) && weight > 0 ? weight : 1,
          device, startAt, endAt,
          Number.isFinite(freqCap) && freqCap >= 0 ? freqCap : 1,
          Number.isFinite(freqHours) && freqHours >= 0 ? freqHours : 24,
          active,
        ],
      )
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table')) {
        return NextResponse.json({ error: 'mediation tables not migrated yet' }, { status: 409, headers: NO_STORE })
      }
      if (msg.includes('FOREIGN KEY')) {
        return NextResponse.json({ error: 'zone_id or slot_key does not exist' }, { status: 400, headers: NO_STORE })
      }
      throw err
    }

    return NextResponse.json({ success: true, message: 'Assignment added to the waterfall' }, { status: 201, headers: NO_STORE })
  } catch (error) {
    console.error('assignments POST error:', error)
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500, headers: NO_STORE })
  }
}

// PUT — update assignment
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

    if (body.slot_key !== undefined) {
      if (!VALID_SLOTS.includes(String(body.slot_key))) {
        return NextResponse.json({ error: 'Invalid slot_key' }, { status: 400, headers: NO_STORE })
      }
      updates.push('slot_key = ?'); values.push(String(body.slot_key))
    }
    if (body.zone_id !== undefined) {
      const zid = Number(body.zone_id)
      if (!Number.isInteger(zid) || zid <= 0) return NextResponse.json({ error: 'Invalid zone_id' }, { status: 400, headers: NO_STORE })
      updates.push('zone_id = ?'); values.push(zid)
    }
    if (body.priority !== undefined) { updates.push('priority = ?'); values.push(Number(body.priority) || 1) }
    if (body.weight !== undefined) { updates.push('weight = ?'); values.push(Number(body.weight) || 1) }
    if (body.device !== undefined) {
      if (!DEVICES.includes(String(body.device))) return NextResponse.json({ error: 'Invalid device' }, { status: 400, headers: NO_STORE })
      updates.push('device = ?'); values.push(String(body.device))
    }
    if (body.start_at !== undefined) { updates.push('start_at = ?'); values.push(body.start_at ? String(body.start_at) : null) }
    if (body.end_at !== undefined) { updates.push('end_at = ?'); values.push(body.end_at ? String(body.end_at) : null) }
    if (body.frequency_cap !== undefined) { const cap = Number(body.frequency_cap); updates.push('frequency_cap = ?'); values.push(Number.isFinite(cap) && cap >= 0 ? cap : 1) }
    if (body.frequency_hours !== undefined) { const hrs = Number(body.frequency_hours); updates.push('frequency_hours = ?'); values.push(Number.isFinite(hrs) && hrs >= 0 ? hrs : 24) }
    if (body.active !== undefined) { updates.push('active = ?'); values.push(body.active ? 1 : 0) }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: NO_STORE })
    }

    try {
      await executeAll(`UPDATE ad_slot_assignments SET ${updates.join(', ')} WHERE id = ?`, [...values, id])
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table')) {
        return NextResponse.json({ error: 'mediation tables not migrated yet' }, { status: 409, headers: NO_STORE })
      }
      if (msg.includes('FOREIGN KEY')) {
        return NextResponse.json({ error: 'zone_id or slot_key does not exist' }, { status: 400, headers: NO_STORE })
      }
      throw err
    }

    return NextResponse.json({ success: true, message: 'Assignment updated' }, { headers: NO_STORE })
  } catch (error) {
    console.error('assignments PUT error:', error)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500, headers: NO_STORE })
  }
}

// DELETE — remove assignment by id (?id=N)
export async function DELETE(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '')
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Valid id required (?id=N)' }, { status: 400, headers: NO_STORE })
    }
    try {
      await executeAll('DELETE FROM ad_slot_assignments WHERE id = ?', [id])
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table')) {
        return NextResponse.json({ error: 'mediation tables not migrated yet' }, { status: 409, headers: NO_STORE })
      }
      throw err
    }
    return NextResponse.json({ success: true, message: 'Assignment removed' }, { headers: NO_STORE })
  } catch (error) {
    console.error('assignments DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500, headers: NO_STORE })
  }
}