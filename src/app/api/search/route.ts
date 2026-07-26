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
    
    // Search in both movies and series - Enhanced search in titles AND descriptions
    const searchTerm = `%${q}%`
    
    const moviesResult = await turso.execute({
      sql: `SELECT *, 'movie' as media_type FROM movies 
            WHERE (
              title_ar LIKE ? OR 
              title_en LIKE ? OR 
              overview_ar LIKE ?
            )
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            ORDER BY 
              CASE 
                WHEN title_ar LIKE ? THEN 1
                WHEN title_en LIKE ? THEN 2
                WHEN overview_ar LIKE ? THEN 3
                ELSE 4
              END,
              popularity DESC
            LIMIT 20`,
      args: [
        searchTerm, searchTerm, searchTerm,  // WHERE conditions
        searchTerm, searchTerm, searchTerm   // ORDER BY conditions
      ]
    })
    
    const seriesResult = await turso.execute({
      sql: `SELECT *, 'tv' as media_type FROM tv_series 
            WHERE (
              name_ar LIKE ? OR 
              name_en LIKE ? OR 
              overview_ar LIKE ?
            )
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            ORDER BY 
              CASE 
                WHEN name_ar LIKE ? THEN 1
                WHEN name_en LIKE ? THEN 2
                WHEN overview_ar LIKE ? THEN 3
                ELSE 4
              END,
              popularity DESC
            LIMIT 20`,
      args: [
        searchTerm, searchTerm, searchTerm,  // WHERE conditions
        searchTerm, searchTerm, searchTerm   // ORDER BY conditions
      ]
    })
    
    const results = [...(moviesResult.rows || []), ...(seriesResult.rows || [])]
    
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ results: [] })
  }
}
