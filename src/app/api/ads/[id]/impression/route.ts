import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'

// POST - Increment ad impressions
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await executeAll(
      'UPDATE ads SET impressions = impressions + 1 WHERE id = ?',
      [parseInt(id)]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error incrementing ad impression:', error)
    return NextResponse.json({ error: 'Failed to increment impression' }, { status: 500 })
  }
}
