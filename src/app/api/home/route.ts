import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  try {
    console.log('🔄 [API /home] Fetching...')
    const startTime = Date.now()

    const [trendingMoviesRes, trendingSeriesRes, latestRes, topRatedRes, seriesRes] = await Promise.all([
      turso.execute({
        sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
              FROM movies 
              WHERE poster_path IS NOT NULL 
                AND backdrop_path IS NOT NULL 
                AND vote_average > 0
                AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
              ORDER BY popularity DESC 
              LIMIT 50`,
        args: []
      }),
      turso.execute({
        sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
              FROM tv_series 
              WHERE poster_path IS NOT NULL 
                AND backdrop_path IS NOT NULL 
                AND vote_average > 0
                AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
              ORDER BY popularity DESC 
              LIMIT 50`,
        args: []
      }),
      turso.execute({
        sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
              FROM movies 
              WHERE poster_path IS NOT NULL
                AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
              ORDER BY release_year DESC, popularity DESC
              LIMIT 50`,
        args: []
      }),
      turso.execute({
        sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
              FROM movies 
              WHERE poster_path IS NOT NULL 
                AND vote_average >= 7.5
                AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
              ORDER BY vote_average DESC
              LIMIT 50`,
        args: []
      }),
      turso.execute({
        sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
              FROM tv_series 
              WHERE poster_path IS NOT NULL
                AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
              ORDER BY popularity DESC
              LIMIT 50`,
        args: []
      })
    ])

    const data = {
      trendingMovies: trendingMoviesRes.rows,
      trendingSeries: trendingSeriesRes.rows,
      latest: latestRes.rows,
      topRated: topRatedRes.rows,
      series: seriesRes.rows
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
      trendingSeries: [],
      latest: [],
      topRated: [],
      series: []
    }, { status: 500 })
  }
}


