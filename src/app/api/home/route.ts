import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Cache for 1 hour

export async function GET() {
  try {
    console.log('🔄 [API /home] Fetching from Turso...')
    const startTime = Date.now()

    // 🚀 Performance Triad: Parallel execution with reduced payload
    const [moviesResult, seriesResult, topRatedResult, popularResult] = await Promise.all([
      turso.execute({
        sql: 'SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, release_year, vote_average FROM movies ORDER BY created_at DESC LIMIT 24',
        args: []
      }),
      turso.execute({
        sql: 'SELECT id, tmdb_id, slug, name_ar, name_en, poster_path, first_air_date, vote_average FROM tv_series ORDER BY created_at DESC LIMIT 24',
        args: []
      }),
      turso.execute({
        sql: 'SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, release_year, vote_average FROM movies WHERE vote_average >= 7 ORDER BY vote_average DESC LIMIT 24',
        args: []
      }),
      turso.execute({
        sql: 'SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, release_year, vote_average FROM movies WHERE vote_average >= 6 ORDER BY vote_average DESC LIMIT 24',
        args: []
      })
    ])

    const endTime = Date.now()
    console.log(`✅ [API /home] Data fetched in ${endTime - startTime}ms`)

    return NextResponse.json({
      latest: moviesResult.rows || [],
      latestSeries: seriesResult.rows || [],
      topRated: topRatedResult.rows || [],
      popular: popularResult.rows || []
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      }
    })
  } catch (error) {
    console.error('❌ [API /home] Error fetching home data:', error)
    return NextResponse.json({
      latest: [],
      latestSeries: [],
      topRated: [],
      popular: []
    }, { status: 500 })
  }
}
