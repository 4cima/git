import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }
    
    // Search in both movies and series
    const searchTerm = `%${q}%`
    
    const moviesResult = await turso.execute({
      sql: `SELECT *, 'movie' as media_type FROM movies 
            WHERE is_filtered = 0 
            AND (title_ar LIKE ? OR title_en LIKE ? OR title LIKE ?)
            LIMIT 10`,
      args: [searchTerm, searchTerm, searchTerm]
    })
    
    const seriesResult = await turso.execute({
      sql: `SELECT *, 'tv' as media_type FROM series 
            WHERE is_filtered = 0 
            AND (name_ar LIKE ? OR name_en LIKE ? OR name LIKE ?)
            LIMIT 10`,
      args: [searchTerm, searchTerm, searchTerm]
    })
    
    const results = [...(moviesResult.rows || []), ...(seriesResult.rows || [])]
    
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ results: [] })
  }
}
