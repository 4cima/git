import { NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'

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

// GET - Fetch single ad
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
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    return NextResponse.json({ data: ad })
  } catch (error) {
    console.error('Error fetching ad:', error)
    return NextResponse.json({ error: 'Failed to fetch ad' }, { status: 500 })
  }
}

// PUT - Update ad
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(parseInt(id))
    const sql = `UPDATE ads SET ${updates.join(', ')} WHERE id = ?`

    await executeAll(sql, values)

    return NextResponse.json({ success: true, message: 'Ad updated successfully' })
  } catch (error) {
    console.error('Error updating ad:', error)
    return NextResponse.json({ error: 'Failed to update ad' }, { status: 500 })
  }
}

// DELETE - Delete ad
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await executeAll('DELETE FROM ads WHERE id = ?', [parseInt(id)])

    return NextResponse.json({ success: true, message: 'Ad deleted successfully' })
  } catch (error) {
    console.error('Error deleting ad:', error)
    return NextResponse.json({ error: 'Failed to delete ad' }, { status: 500 })
  }
}
