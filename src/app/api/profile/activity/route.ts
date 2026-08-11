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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') || 'all' // all, watch_history, favorites, reviews

    let items: any[] = []

    if (type === 'all' || type === 'watch_history') {
      const watchHistory = await turso.execute({
        sql: `
          SELECT 
            'watch' as activity_type,
            content_type,
            tmdb_id,
            title,
            poster_path,
            watch_date as activity_date,
            watch_duration,
            completed,
            season_number,
            episode_number
          FROM watch_history 
          WHERE user_id = ?
          ORDER BY watch_date DESC
          LIMIT ?
        `,
        args: [userId, limit],
      })
      items.push(...watchHistory.rows)
    }

    if (type === 'all' || type === 'favorites') {
      const favorites = await turso.execute({
        sql: `
          SELECT 
            'favorite' as activity_type,
            content_type,
            tmdb_id,
            title,
            poster_path,
            added_at as activity_date
          FROM favorites 
          WHERE user_id = ?
          ORDER BY added_at DESC
          LIMIT ?
        `,
        args: [userId, limit],
      })
      items.push(...favorites.rows)
    }

    if (type === 'all' || type === 'reviews') {
      const reviews = await turso.execute({
        sql: `
          SELECT 
            'review' as activity_type,
            content_type,
            tmdb_id,
            title,
            rating,
            review_text,
            created_at as activity_date
          FROM user_reviews 
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
        args: [userId, limit],
      })
      items.push(...reviews.rows)
    }

    // Sort all items by date
    items.sort((a, b) => {
      const dateA = new Date(a.activity_date as string).getTime()
      const dateB = new Date(b.activity_date as string).getTime()
      return dateB - dateA
    })

    // Limit final result
    items = items.slice(0, limit)

    return NextResponse.json({ activities: items })
  } catch (error) {
    console.error('Failed to fetch activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}
