import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'

// POST - Increment ad clicks
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await executeAll(
      'UPDATE ads SET clicks = clicks + 1 WHERE id = ?',
      [parseInt(id)]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error incrementing ad click:', error)
    return NextResponse.json({ error: 'Failed to increment click' }, { status: 500 })
  }
}
