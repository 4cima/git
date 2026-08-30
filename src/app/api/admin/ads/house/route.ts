/**
 * /api/admin/ads/house — Admin CRUD for the House Ads table (`ads`).
 * Protected by src/middleware.ts (covers /api/admin/*) using the same
 * Basic Auth or admin/supervisor session as the rest of the admin panel.
 * All responses: Cache-Control: no-store.
 */
import { NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { isSafeAdUrl } from '@/lib/adsAllowlist'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

type AdRow = {
  id: number
  title: string
  type: string
  content: string
  position?: string | null
  active?: number | null
  impressions?: number | null
  clicks?: number | null
  click_url?: string | null
  weight?: number | null
  device?: string | null
  start_at?: string | null
  end_at?: string | null
  frequency_cap?: number | null
  frequency_hours?: number | null
  impression_cap?: number | null
  created_at?: string | null
  updated_at?: string | null
}

// GET — list house ads (admin view: all rows incl. paused)
export async function GET() {
  try {
    const ads = await executeAll<AdRow>('SELECT * FROM ads ORDER BY created_at DESC')
    return NextResponse.json({ data: ads }, { headers: NO_STORE })
  } catch (error) {
    console.error('house GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch house ads' }, { status: 500, headers: NO_STORE })
  }
}

// POST — create house ad
export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const type = typeof body.type === 'string' ? body.type : ''
    const content = typeof body.content === 'string' ? body.content : ''
    const position = typeof body.position === 'string' && body.position.trim() ? body.position.trim() : null
    const active = body.active === 0 ? 0 : 1
    const clickUrl = typeof body.click_url === 'string' && body.click_url.trim() ? body.click_url.trim() : null

    if (!title || !type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, type, content' },
        { status: 400, headers: NO_STORE },
      )
    }

    const validTypes = ['popunder', 'banner', 'preroll', 'midroll']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400, headers: NO_STORE },
      )
    }

    if (clickUrl && !isSafeAdUrl(clickUrl)) {
      return NextResponse.json(
        { error: 'click_url must be a valid http/https URL' },
        { status: 400, headers: NO_STORE },
      )
    }

    // click_url/updated_at columns may not exist before the migration runs
    try {
      await executeAll(
        `INSERT INTO ads (title, type, content, position, active, click_url, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [title, type, content, position, active, clickUrl],
      )
    } catch {
      await executeAll(
        `INSERT INTO ads (title, type, content, position, active)
         VALUES (?, ?, ?, ?, ?)`,
        [title, type, content, position, active],
      )
    }

    return NextResponse.json({ success: true, message: 'House ad created' }, { status: 201, headers: NO_STORE })
  } catch (error) {
    console.error('house POST error:', error)
    return NextResponse.json({ error: 'Failed to create house ad' }, { status: 500, headers: NO_STORE })
  }
}

// PUT — update house ad by body.id
export async function PUT(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Valid id required' }, { status: 400, headers: NO_STORE })
    }

    const updates: string[] = []
    const values: (string | number | boolean | null)[] = []

    if (body.title !== undefined) { updates.push('title = ?'); values.push(String(body.title)) }
    if (body.type !== undefined) {
      const validTypes = ['popunder', 'banner', 'preroll', 'midroll']
      if (!validTypes.includes(String(body.type))) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400, headers: NO_STORE })
      }
      updates.push('type = ?'); values.push(String(body.type))
    }
    if (body.content !== undefined) { updates.push('content = ?'); values.push(String(body.content)) }
    if (body.position !== undefined) { updates.push('position = ?'); values.push(body.position ? String(body.position) : null) }
    if (body.active !== undefined) { updates.push('active = ?'); values.push(body.active ? 1 : 0) }
    if (body.click_url !== undefined) {
      const clickUrl = body.click_url ? String(body.click_url).trim() : null
      if (clickUrl && !isSafeAdUrl(clickUrl)) {
        return NextResponse.json({ error: 'click_url must be http/https' }, { status: 400, headers: NO_STORE })
      }
      updates.push('click_url = ?'); values.push(clickUrl)
    }
    if (body.weight !== undefined) { updates.push('weight = ?'); values.push(Number(body.weight) || 1) }
    if (body.device !== undefined) {
      const device = String(body.device || 'all')
      if (!['all', 'mobile', 'desktop'].includes(device)) {
        return NextResponse.json({ error: 'Invalid device' }, { status: 400, headers: NO_STORE })
      }
      updates.push('device = ?'); values.push(device)
    }
    if (body.start_at !== undefined) { updates.push('start_at = ?'); values.push(body.start_at ? String(body.start_at) : null) }
    if (body.end_at !== undefined) { updates.push('end_at = ?'); values.push(body.end_at ? String(body.end_at) : null) }
    if (body.frequency_cap !== undefined) { updates.push('frequency_cap = ?'); values.push(Number(body.frequency_cap) || 1) }
    if (body.frequency_hours !== undefined) { updates.push('frequency_hours = ?'); values.push(Number(body.frequency_hours) || 24) }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: NO_STORE })
    }

    // updated_at column may not exist before migration — try with it, retry without
    const baseUpdates = [...updates]
    const baseValues = [...values]
    try {
      await executeAll(
        `UPDATE ads SET ${[...baseUpdates, "updated_at = datetime('now')"].join(', ')} WHERE id = ?`,
        [...baseValues, id],
      )
    } catch {
      await executeAll(`UPDATE ads SET ${baseUpdates.join(', ')} WHERE id = ?`, [...baseValues, id])
    }

    return NextResponse.json({ success: true, message: 'House ad updated' }, { headers: NO_STORE })
  } catch (error) {
    console.error('house PUT error:', error)
    return NextResponse.json({ error: 'Failed to update house ad' }, { status: 500, headers: NO_STORE })
  }
}

// DELETE — delete house ad by id (?id=N)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '')
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Valid id required (?id=)' }, { status: 400, headers: NO_STORE })
    }

    const ad = await executeFirst<AdRow>('SELECT id FROM ads WHERE id = ?', [id])
    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404, headers: NO_STORE })
    }

    await executeAll('DELETE FROM ads WHERE id = ?', [id])
    return NextResponse.json({ success: true, message: 'House ad deleted' }, { headers: NO_STORE })
  } catch (error) {
    console.error('house DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete house ad' }, { status: 500, headers: NO_STORE })
  }
}
