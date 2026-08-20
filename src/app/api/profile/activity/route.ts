import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
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
    const limit  = parseInt(request.nextUrl.searchParams.get('limit') || '20')
    const type   = request.nextUrl.searchParams.get('type') || 'all'

    let items: any[] = []

    if (type === 'all' || type === 'watch_history') {
      const rows = await executeAll(
        `SELECT 'watch' as activity_type, content_type, tmdb_id, title, poster_path,
                watch_date as activity_date, watch_duration, completed, season_number, episode_number
         FROM watch_history WHERE user_id = ? ORDER BY watch_date DESC LIMIT ?`,
        [userId, limit]
      )
      items.push(...rows)
    }
    if (type === 'all' || type === 'favorites') {
      const rows = await executeAll(
        `SELECT 'favorite' as activity_type, content_type, tmdb_id, title, poster_path, added_at as activity_date
         FROM favorites WHERE user_id = ? ORDER BY added_at DESC LIMIT ?`,
        [userId, limit]
      )
      items.push(...rows)
    }
    if (type === 'all' || type === 'reviews') {
      const rows = await executeAll(
        `SELECT 'review' as activity_type, content_type, tmdb_id, title, rating, review_text, created_at as activity_date
         FROM user_reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, limit]
      )
      items.push(...rows)
    }

    items.sort((a, b) => new Date(b.activity_date as string).getTime() - new Date(a.activity_date as string).getTime())
    return NextResponse.json({ activities: items.slice(0, limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
