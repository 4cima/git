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
      genreIds = genres.map((g: any) => g.tmdb_id || g.id).filter((id: any) => typeof id === 'number')
    } catch {
      return NextResponse.json({ data: [] })
    }
    
    if (genreIds.length === 0) {
      return NextResponse.json({ data: [] })
    }
    
    // Find similar series with overlapping genres
    const similar = await executeAll(
      `SELECT id, slug, name_ar, name_en, poster_path, vote_average, first_air_date
       FROM tv_series
       WHERE tmdb_id != ?
         AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
         AND genres_json IS NOT NULL
         AND (${genreIds.map(() => `genres_json LIKE ?`).join(' OR ')})
       ORDER BY vote_average DESC, vote_count DESC
       LIMIT ?`,
      [
        series.tmdb_id,
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
    console.error('❌ [API /tv/:slug/similar] Error:', error)
    return NextResponse.json({ data: [] }, { status: 500 })
  }
}
