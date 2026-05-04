import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }
    
    const response = await fetch(`${WORKER_URL}/api/search?q=${encodeURIComponent(q)}`)
    
    if (!response.ok) {
      return NextResponse.json({ results: [] })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ results: [] })
  }
}
