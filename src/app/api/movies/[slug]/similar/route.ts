import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 24)
    
    // Get the current movie's genres
    const movie = await executeFirst(
      `SELECT tmdb_id, genres_json FROM movies WHERE slug = ? LIMIT 1`,
      [slug]
    )
    
    if (!movie || !movie.genres_json) {
      return NextResponse.json({ data: [] })
    }
    
    let genreIds: number[] = []
    try {
      const genres = typeof movie.genres_json === 'string' 
        ? JSON.parse(movie.genres_json) 
        : movie.genres_json
      genreIds = genres.map((g: any) => g.tmdb_id || g.id).filter((id: any) => typeof id === 'number')
    } catch {
      return NextResponse.json({ data: [] })
    }
    
    if (genreIds.length === 0) {
      return NextResponse.json({ data: [] })
    }
    
    // Find similar movies with overlapping genres
    const similar = await executeAll(
      `SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_date
       FROM movies
       WHERE tmdb_id != ?
         AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
         AND genres_json IS NOT NULL
         AND (${genreIds.map(() => `genres_json LIKE ?`).join(' OR ')})
       ORDER BY vote_average DESC, vote_count DESC
       LIMIT ?`,
      [
        movie.tmdb_id,
        ...genreIds.map(id => `%"tmdb_id":${id}%`),
        limit
      ]
    )
    
    return NextResponse.json(
      { data: similar || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        }
      }
    )
  } catch (error) {
    console.error('❌ [API /movies/:slug/similar] Error:', error)
    return NextResponse.json({ data: [] }, { status: 500 })
  }
}
