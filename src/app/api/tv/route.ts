import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'
    const searchParams = request.nextUrl.searchParams
    
    const queryString = searchParams.toString()
    const url = `${WORKER_URL}/api/tv${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      return NextResponse.json({ results: [], total: 0 }, { status: response.status })
    }
    
    const data = await response.json()
    
    // Ensure consistent response format
    return NextResponse.json({
      results: data.results || [],
      page: data.page || 1,
      limit: data.limit || 20,
      total: data.total || 0
    })
  } catch (error) {
    console.error('Error fetching TV shows:', error)
    return NextResponse.json({ results: [], total: 0 }, { status: 500 })
  }
}
