import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export async function PUT(request: NextRequest) {
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

    const { showWatchHistory, showFavorites } = await request.json()

    // Store privacy settings in Turso (create table if needed)
    await turso.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS user_privacy_settings (
          user_id TEXT PRIMARY KEY,
          show_watch_history BOOLEAN DEFAULT 1,
          show_favorites BOOLEAN DEFAULT 1,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `,
      args: [],
    })

    await turso.execute({
      sql: `
        INSERT INTO user_privacy_settings (user_id, show_watch_history, show_favorites, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          show_watch_history = excluded.show_watch_history,
          show_favorites = excluded.show_favorites,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [session.user.id, showWatchHistory ? 1 : 0, showFavorites ? 1 : 0],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update privacy settings:', error)
    return NextResponse.json(
      { error: 'فشل تحديث إعدادات الخصوصية' },
      { status: 500 }
    )
  }
}
