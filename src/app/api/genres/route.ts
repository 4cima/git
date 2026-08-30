import { NextResponse, NextRequest } from 'next/server'
import { getGenresWithCounts } from '@/lib/genres'

// Safe for dynamic - uses precomputed genre_counts table (fast JOIN on primary key)
// Instead of expensive json_each() on 321k rows
export const dynamic = 'force-dynamic' // D1 not available at build time on CI

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as 'movie' | 'tv' | null
    
    const genres = await getGenresWithCounts(type || undefined)
    
    return NextResponse.json({ genres })
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json(
      { error: 'Failed to fetch genres' },
      { status: 500 }
    )
  }
}
