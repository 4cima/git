import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    const { username, avatar_url } = await request.json()

    if (!username || !username.trim()) {
      return NextResponse.json({ error: 'اسم المستخدم مطلوب' }, { status: 400 })
    }

    // Check if username is already taken by another user
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .neq('id', session.user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 400 })
    }

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
        avatar_url: avatar_url || null,
      })
      .eq('id', session.user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update profile:', error)
    return NextResponse.json(
      { error: 'فشل تحديث الملف الشخصي' },
      { status: 500 }
    )
  }
}
