import { NextRequest, NextResponse } from 'next/server'
import { searchContent } from '@/lib/search-content'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')
    if (!q || q.length < 1) {
      return NextResponse.json({ results: [], searchStrategy: 'min-1-char' })
    }

    const { results, totalFound, searchStrategy } = await searchContent(q)
    return NextResponse.json({ results, totalFound, searchStrategy })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ results: [], error: 'Search failed' })
  }
}
