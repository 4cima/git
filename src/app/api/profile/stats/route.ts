import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const [watchStats, favRow, revRow, achRow] = await Promise.all([
      executeFirst(
        `SELECT COUNT(DISTINCT CASE WHEN content_type='movie' THEN tmdb_id END) as movies_watched,
                COUNT(DISTINCT CASE WHEN content_type='series' THEN tmdb_id END) as series_watched,
                SUM(watch_duration) as total_watch_time
         FROM watch_history WHERE user_id = ?`,
        [userId]
      ),
      executeFirst('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?', [userId]),
      executeFirst('SELECT COUNT(*) as count FROM user_reviews WHERE user_id = ?', [userId]),
      executeFirst('SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?', [userId]),
    ])

    return NextResponse.json({
      moviesWatched:  Number(watchStats?.movies_watched) || 0,
      seriesWatched:  Number(watchStats?.series_watched) || 0,
      totalWatchTime: Math.round((Number(watchStats?.total_watch_time) || 0) / 3600),
      favorites:      Number(favRow?.count) || 0,
      reviews:        Number(revRow?.count) || 0,
      achievements:   Number(achRow?.count) || 0,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
