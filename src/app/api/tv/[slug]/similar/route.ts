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
    
    // Get the current series' genres
    const series = await executeFirst(
      `SELECT tmdb_id, genres_json FROM tv_series WHERE slug = ? LIMIT 1`,
      [slug]
    )
    
    if (!series || !series.genres_json) {
      return NextResponse.json({ data: [] })
    }
    
    let genreIds: number[] = []
    try {
      const genres = typeof series.genres_json === 'string' 
        ? JSON.parse(series.genres_json) 
        : series.genres_json
      genreIds = genres.map((g: any) => Number(g.tmdb_id ?? g.id)).filter((id: any) => !isNaN(id) && id > 0)
    } catch {
      return NextResponse.json({ data: [] })
    }
    
    if (genreIds.length === 0) {
      return NextResponse.json({ data: [] })
    }
    
    // Find similar series with overlapping genres using json_each for better performance
    const placeholders = genreIds.map(() => '?').join(',')
    const similar = await executeAll(
      `SELECT s.id, s.slug, s.name_ar, s.name_en, s.poster_path, s.vote_average, s.first_air_date,
              COUNT(DISTINCT json_extract(j.value, '$.tmdb_id')) as overlap
       FROM tv_series s, json_each(s.genres_json) j
       WHERE s.tmdb_id != ?
         AND (s.filter_status IN ('clean', 'reviewed_approved') OR s.filter_status IS NULL)
         AND s.genres_json IS NOT NULL
         AND s.vote_count >= 50
         AND json_extract(j.value, '$.tmdb_id') IN (${placeholders})
       GROUP BY s.tmdb_id
       HAVING overlap >= ${Math.min(2, genreIds.length)}
       ORDER BY overlap DESC, s.vote_count DESC, s.vote_average DESC
       LIMIT ?`,
      [
        series.tmdb_id,
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
    console.error('❌ [API /tv/:slug/similar] Error:', error)
    return NextResponse.json({ data: [] }, { status: 500 })
  }
}
