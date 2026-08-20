import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE(request: NextRequest) {
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
    await Promise.all([
      executeAll('DELETE FROM watch_history WHERE user_id = ?',             [userId]),
      executeAll('DELETE FROM favorites WHERE user_id = ?',                 [userId]),
      executeAll('DELETE FROM user_reviews WHERE user_id = ?',              [userId]),
      executeAll('DELETE FROM user_achievements WHERE user_id = ?',         [userId]),
      executeAll('DELETE FROM user_privacy_settings WHERE user_id = ?',     [userId]),
      executeAll('DELETE FROM user_notification_settings WHERE user_id = ?',[userId]),
    ])

    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.admin.deleteUser(userId)
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'فشل حذف الحساب' }, { status: 500 })
  }
}
