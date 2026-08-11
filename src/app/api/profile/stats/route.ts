import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all stats in parallel
    const [
      watchHistoryResult,
      favoritesResult,
      reviewsResult,
      achievementsResult,
    ] = await Promise.all([
      turso.execute({
        sql: `
          SELECT 
            COUNT(DISTINCT CASE WHEN content_type = 'movie' THEN tmdb_id END) as movies_watched,
            COUNT(DISTINCT CASE WHEN content_type = 'series' THEN tmdb_id END) as series_watched,
            SUM(watch_duration) as total_watch_time
          FROM watch_history 
          WHERE user_id = ?
        `,
        args: [userId],
      }),
      turso.execute({
        sql: 'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
        args: [userId],
      }),
      turso.execute({
        sql: 'SELECT COUNT(*) as count FROM user_reviews WHERE user_id = ?',
        args: [userId],
      }),
      turso.execute({
        sql: 'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?',
        args: [userId],
      }),
    ])

    const watchStats = watchHistoryResult.rows[0] || {}
    const moviesWatched = Number(watchStats.movies_watched) || 0
    const seriesWatched = Number(watchStats.series_watched) || 0
    const totalWatchTime = Math.round((Number(watchStats.total_watch_time) || 0) / 3600) // convert to hours
    const favorites = Number(favoritesResult.rows[0]?.count) || 0
    const reviews = Number(reviewsResult.rows[0]?.count) || 0
    const achievements = Number(achievementsResult.rows[0]?.count) || 0

    return NextResponse.json({
      moviesWatched,
      seriesWatched,
      totalWatchTime,
      favorites,
      reviews,
      achievements,
    })
  } catch (error) {
    console.error('Failed to fetch profile stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
