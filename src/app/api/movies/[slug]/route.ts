import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'
    const { slug } = await params
    
    const response = await fetch(`${WORKER_URL}/api/movies/${slug}`)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Movie not found' }, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching movie:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
