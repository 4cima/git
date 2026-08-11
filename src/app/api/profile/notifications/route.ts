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

    const { emailNotifications, newContentNotif } = await request.json()

    // Store notification settings in Turso
    await turso.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS user_notification_settings (
          user_id TEXT PRIMARY KEY,
          email_notifications BOOLEAN DEFAULT 1,
          new_content_notif BOOLEAN DEFAULT 1,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `,
      args: [],
    })

    await turso.execute({
      sql: `
        INSERT INTO user_notification_settings (user_id, email_notifications, new_content_notif, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          email_notifications = excluded.email_notifications,
          new_content_notif = excluded.new_content_notif,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [session.user.id, emailNotifications ? 1 : 0, newContentNotif ? 1 : 0],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update notification settings:', error)
    return NextResponse.json(
      { error: 'فشل تحديث إعدادات الإشعارات' },
      { status: 500 }
    )
  }
}
