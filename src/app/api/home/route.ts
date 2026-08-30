import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

export async function GET() {
  try {
    console.log('🔄 [API /home] Fetching...')
    const startTime = Date.now()

    const [trendingMovies, trendingSeries] = await Promise.all([
      executeAll(
        `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar,
                printf('%04d-01-01', release_year) AS release_date, vote_average, genres_json
         FROM list_movies_popular
         ORDER BY rank
         LIMIT 100`,
        []
      ),
      executeAll(
        `SELECT id, tmdb_id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar,
                printf('%04d-01-01', first_air_year) AS first_air_date, vote_average, genres_json
         FROM list_series_popular
         ORDER BY rank
         LIMIT 100`,
        []
      )
    ])

    console.log(`✅ [API /home] Data fetched in ${Date.now() - startTime}ms`)

    return NextResponse.json(
      { trendingMovies, trendingSeries },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    console.error('❌ [API /home] Error:', error)
    return NextResponse.json({ trendingMovies: [], trendingSeries: [] }, { status: 500 })
  }
}
