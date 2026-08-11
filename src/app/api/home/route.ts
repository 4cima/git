import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  try {
    console.log('🔄 [API /home] Fetching...')
    const startTime = Date.now()

    const [trendingMoviesRes, trendingSeriesRes] = await Promise.all([
      turso.execute({
        sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
              FROM movies INDEXED BY idx_movies_pop_partial2
              WHERE poster_path IS NOT NULL 
                AND backdrop_path IS NOT NULL 
                AND vote_average > 0
              ORDER BY popularity DESC 
              LIMIT 100`,
        args: []
      }),
      turso.execute({
        sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
              FROM tv_series INDEXED BY idx_series_home_trending
              WHERE poster_path IS NOT NULL 
                AND backdrop_path IS NOT NULL 
                AND vote_average > 0
              ORDER BY popularity DESC 
              LIMIT 100`,
        args: []
      })
    ])

    const data = {
      trendingMovies: trendingMoviesRes.rows,
      trendingSeries: trendingSeriesRes.rows
    }

    const endTime = Date.now()
    console.log(`✅ [API /home] Data fetched in ${endTime - startTime}ms`)

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      }
    })
  } catch (error) {
    console.error('❌ [API /home] Error:', error)
    return NextResponse.json({
      trendingMovies: [],
      trendingSeries: []
    }, { status: 500 })
  }
}


