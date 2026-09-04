import { NextRequest, NextResponse } from 'next/server'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    const response = await fetch(`${WORKER_URL}/api/anime?${queryString}`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({
        results: [],
        total: 0,
        page: 1,
        totalPages: 0
      }, { status: 200 })
    }

    const data = await response.json()
    // فلتر دفاعي: استبعاد Talk Show + War & Politics + Documentary + History من نتائج الـ worker
    if (Array.isArray(data?.results)) {
      data.results = filterExcludedGenres(data.results)
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ [API /anime] Error:', error)
    return NextResponse.json({
      results: [],
      total: 0,
      page: 1,
      totalPages: 0
    }, { status: 200 })
  }
}
