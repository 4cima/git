import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { validateUsername, canChangeUsername } from '@/lib/usernameValidator'

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

    // Get current profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('username, username_last_changed')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'فشل جلب بيانات الملف الشخصي' }, { status: 500 })
    }

    const trimmedUsername = username.trim()

    // Check if username is actually changing
    const isUsernameChanging = currentProfile.username !== trimmedUsername

    if (isUsernameChanging) {
      // Validate username format and content
      const validation = validateUsername(trimmedUsername)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }

      // Check 24-hour cooldown
      const changeCheck = canChangeUsername(currentProfile.username_last_changed)
      if (!changeCheck.canChange) {
        return NextResponse.json({ error: changeCheck.error }, { status: 429 })
      }

      // Check if username is already taken by another user
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', session.user.id)
        .single()

      if (existingProfile) {
        return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 400 })
      }

      // Update profile with new username and timestamp
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: trimmedUsername,
          avatar_url: avatar_url || null,
          username_last_changed: new Date().toISOString(),
        })
        .eq('id', session.user.id)

      if (updateError) throw updateError
    } else {
      // Only updating avatar, not username
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatar_url || null,
        })
        .eq('id', session.user.id)

      if (updateError) throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update profile:', error)
    return NextResponse.json(
      { error: 'فشل تحديث الملف الشخصي' },
      { status: 500 }
    )
  }
}
