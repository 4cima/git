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
      genreIds = genres.map((g: any) => Number(g.tmdb_id ?? g.id)).filter((id: any) => !isNaN(id) && id > 0)
    } catch {
      return NextResponse.json({ data: [] })
    }
    
    if (genreIds.length === 0) {
      return NextResponse.json({ data: [] })
    }
    
    // Find similar movies with overlapping genres using json_each for better performance
    const placeholders = genreIds.map(() => '?').join(',')
    const similar = await executeAll(
      `SELECT m.id, m.slug, m.title_ar, m.title_en, m.poster_path, m.vote_average, m.release_date,
              COUNT(DISTINCT json_extract(j.value, '$.tmdb_id')) as overlap
       FROM movies m, json_each(m.genres_json) j
       WHERE m.tmdb_id != ?
         AND (m.filter_status IN ('clean', 'reviewed_approved') OR m.filter_status IS NULL)
         AND m.genres_json IS NOT NULL
         AND m.vote_count >= 50
         AND json_extract(j.value, '$.tmdb_id') IN (${placeholders})
       GROUP BY m.tmdb_id
       HAVING overlap >= ${Math.min(2, genreIds.length)}
       ORDER BY overlap DESC, m.vote_count DESC, m.vote_average DESC
       LIMIT ?`,
      [
        movie.tmdb_id,
        ...genreIds,
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
