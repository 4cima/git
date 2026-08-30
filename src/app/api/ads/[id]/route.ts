import { NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'

export const dynamic = 'force-dynamic'

type AdRow = {
  id: number
  title: string
  type: 'popunder' | 'banner' | 'preroll' | 'midroll'
  content: string
  position?: string | null
  active?: number | null
  impressions?: number | null
  clicks?: number | null
  created_at?: string | null
}

const NO_STORE = { 'Cache-Control': 'private, no-store' }

// GET - Fetch single ad (read stays temporarily compatible, never cached)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ad = await executeFirst<AdRow>(
      'SELECT * FROM ads WHERE id = ?',
      [parseInt(id)]
    )

    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404, headers: NO_STORE })
    }

    return NextResponse.json({ data: ad }, { headers: NO_STORE })
  } catch (error) {
    console.error('Error fetching ad:', error)
    return NextResponse.json({ error: 'Failed to fetch ad' }, { status: 500, headers: NO_STORE })
  }
}

// PUT - LOCKED: 401 unless admin. Admin CRUD moved to /api/admin/ads/house.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const { id } = await params
    const body = await request.json()
    const { title, type, content, position, active } = body

    // Build dynamic UPDATE query
    const updates: string[] = []
    const values: any[] = []

    if (title !== undefined) {
      updates.push('title = ?')
      values.push(title)
    }
    if (type !== undefined) {
      updates.push('type = ?')
      values.push(type)
    }
    if (content !== undefined) {
      updates.push('content = ?')
      values.push(content)
    }
    if (position !== undefined) {
      updates.push('position = ?')
      values.push(position || null)
    }
    if (active !== undefined) {
      updates.push('active = ?')
      values.push(active)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: NO_STORE })
    }

    values.push(parseInt(id))
    const sql = `UPDATE ads SET ${updates.join(', ')} WHERE id = ?`

    await executeAll(sql, values)

    return NextResponse.json({ success: true, message: 'Ad updated successfully' }, { headers: NO_STORE })
  } catch (error) {
    console.error('Error updating ad:', error)
    return NextResponse.json({ error: 'Failed to update ad' }, { status: 500, headers: NO_STORE })
  }
}

// DELETE - LOCKED: 401 unless admin. Admin CRUD moved to /api/admin/ads/house.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    await executeAll('DELETE FROM ads WHERE id = ?', [parseInt(id)])

    return NextResponse.json({ success: true, message: 'Ad deleted successfully' }, { headers: NO_STORE })
  } catch (error) {
    console.error('Error deleting ad:', error)
    return NextResponse.json({ error: 'Failed to delete ad' }, { status: 500, headers: NO_STORE })
  }
}
