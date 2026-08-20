import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { emailNotifications, newContentNotif } = await request.json()

    await executeAll(
      `INSERT INTO user_notification_settings (user_id, email_notifications, new_content_notifications, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         email_notifications = excluded.email_notifications,
         new_content_notifications = excluded.new_content_notifications,
         updated_at = CURRENT_TIMESTAMP`,
      [session.user.id, emailNotifications ? 1 : 0, newContentNotif ? 1 : 0]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'فشل تحديث إعدادات الإشعارات' }, { status: 500 })
  }
}
