import { NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Cache for 1 hour

export async function GET() {
  try {
    console.log('🔄 [API /home] Fetching from Turso...')

    // Fetch latest 24 movies
    const moviesResult = await turso.execute({
      sql: 'SELECT * FROM movies WHERE is_filtered = 0 ORDER BY created_at DESC LIMIT 24',
      args: []
    })

    // Fetch latest 24 series
    const seriesResult = await turso.execute({
      sql: 'SELECT * FROM series WHERE is_filtered = 0 ORDER BY created_at DESC LIMIT 24',
      args: []
    })

    // Fetch top rated (vote_average >= 7)
    const topRatedResult = await turso.execute({
      sql: 'SELECT * FROM movies WHERE is_filtered = 0 AND vote_average >= 7 ORDER BY vote_average DESC, vote_count DESC LIMIT 24',
      args: []
    })

    // Fetch popular (vote_count >= 100)
    const popularResult = await turso.execute({
      sql: 'SELECT * FROM movies WHERE is_filtered = 0 AND vote_count >= 100 ORDER BY vote_count DESC LIMIT 24',
      args: []
    })

    console.log('✅ [API /home] Data fetched successfully')

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
