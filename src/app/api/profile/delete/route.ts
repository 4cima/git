import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export async function DELETE(request: NextRequest) {
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

    // Delete all user data from Turso
    await Promise.all([
      turso.execute({
        sql: 'DELETE FROM watch_history WHERE user_id = ?',
        args: [userId],
      }),
      turso.execute({
        sql: 'DELETE FROM favorites WHERE user_id = ?',
        args: [userId],
      }),
      turso.execute({
        sql: 'DELETE FROM user_reviews WHERE user_id = ?',
        args: [userId],
      }),
      turso.execute({
        sql: 'DELETE FROM user_achievements WHERE user_id = ?',
        args: [userId],
      }),
      turso.execute({
        sql: 'DELETE FROM user_privacy_settings WHERE user_id = ?',
        args: [userId],
      }),
      turso.execute({
        sql: 'DELETE FROM user_notification_settings WHERE user_id = ?',
        args: [userId],
      }),
    ])

    // Delete profile from Supabase
    await supabase.from('profiles').delete().eq('id', userId)

    // Delete user from Supabase Auth (admin function)
    // Note: This requires service role key in production
    await supabase.auth.admin.deleteUser(userId)

    // Sign out
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete account:', error)
    return NextResponse.json(
      { error: 'فشل حذف الحساب' },
      { status: 500 }
    )
  }
}
