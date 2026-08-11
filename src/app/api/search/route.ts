import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { sanitizeSearchInput } from '@/lib/search-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }
    
    // Use FTS5 full-text search - 100x faster than LIKE '%term%'
    // Reads: ~50-100K → <500 per search
    // Sanitize to prevent FTS5 operator parsing (e.g., "Spider-Man" hyphen = NOT operator)
    const searchTerm = sanitizeSearchInput(q)
    
    // Search movies using FTS5 index
    const moviesResult = await turso.execute({
      sql: `
        SELECT movies.*, 'movie' as media_type
        FROM movies
        JOIN movies_fts ON movies.id = movies_fts.rowid
        WHERE movies_fts MATCH ?
          AND (movies.filter_status IN ('clean', 'reviewed_approved') OR movies.filter_status IS NULL)
        ORDER BY rank
        LIMIT 20
      `,
      args: [searchTerm]
    })
    
    // Search series using FTS5 index
    const seriesResult = await turso.execute({
      sql: `
        SELECT tv_series.*, 'tv' as media_type
        FROM tv_series
        JOIN series_fts ON tv_series.id = series_fts.rowid
        WHERE series_fts MATCH ?
          AND (tv_series.filter_status IN ('clean', 'reviewed_approved') OR tv_series.filter_status IS NULL)
        ORDER BY rank
        LIMIT 20
      `,
      args: [searchTerm]
    })
    
    const results = [...(moviesResult.rows || []), ...(seriesResult.rows || [])]
    
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ results: [] })
  }
}
