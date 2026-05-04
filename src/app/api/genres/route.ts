import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'
    
    const response = await fetch(`${WORKER_URL}/api/genres`)
    
    if (!response.ok) {
      return NextResponse.json([])
    }
    
    const genres = await response.json()
    
    // Worker returns array directly
    return NextResponse.json(genres)
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json([])
  }
}
