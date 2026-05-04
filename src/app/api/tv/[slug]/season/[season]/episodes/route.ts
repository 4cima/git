import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; season: string }> }
) {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'
    const { slug, season } = await params
    
    const response = await fetch(`${WORKER_URL}/api/tv/${slug}/season/${season}/episodes`)
    
    if (!response.ok) {
      return NextResponse.json({ episodes: [], servers: [] }, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return NextResponse.json({ episodes: [], servers: [] }, { status: 500 })
  }
}
