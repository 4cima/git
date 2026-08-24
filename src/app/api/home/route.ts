import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  try {
    console.log('🔄 [API /home] Fetching...')
    const startTime = Date.now()

    // Use idx_movies_popularity and idx_tv_popularity (exist in D1 schema)
    const [trendingMovies, trendingSeries] = await Promise.all([
      executeAll(
        `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar,
                release_year as year, vote_average, genres_json
         FROM movies INDEXED BY idx_movies_popularity
         WHERE poster_path IS NOT NULL
           AND backdrop_path IS NOT NULL
           AND vote_average > 0
         ORDER BY popularity DESC
         LIMIT 100`,
        []
      ),
      executeAll(
        `SELECT id, tmdb_id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar,
                first_air_year as year, vote_average, genres_json
         FROM tv_series INDEXED BY idx_tv_popularity
         WHERE poster_path IS NOT NULL
           AND backdrop_path IS NOT NULL
           AND vote_average > 0
         ORDER BY popularity DESC
         LIMIT 100`,
        []
      )
    ])

    console.log(`✅ [API /home] Data fetched in ${Date.now() - startTime}ms`)

    return NextResponse.json(
      { trendingMovies, trendingSeries },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    )
  } catch (error) {
    console.error('❌ [API /home] Error:', error)
    return NextResponse.json({ trendingMovies: [], trendingSeries: [] }, { status: 500 })
  }
}
