import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Cache for 1 hour

export async function GET() {
  try {
    // Get all genres with counts
    const genresResult = await turso.execute(`
      SELECT 
        g.*,
        (SELECT COUNT(*) FROM content_genres cg 
         WHERE cg.genre_id = g.id AND cg.content_type = 'movie') as movie_count,
        (SELECT COUNT(*) FROM content_genres cg 
         WHERE cg.genre_id = g.id AND cg.content_type = 'tv_series') as series_count
      FROM genres g
      ORDER BY g.name_ar ASC
    `)
    
    const genres = genresResult.rows.map(genre => ({
      ...genre,
      movie_count: Number(genre.movie_count || 0),
      series_count: Number(genre.series_count || 0),
      total_count: Number(genre.movie_count || 0) + Number(genre.series_count || 0)
    }))
    
    return NextResponse.json({ genres })
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json(
      { error: 'Failed to fetch genres' },
      { status: 500 }
    )
  }
}
