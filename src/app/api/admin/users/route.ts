import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * GET /api/admin/users?search=query
 * Lists all profiles with optional search
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  try {
    let query = supabase
      .from('profiles')
      .select('id, username, email, role, banned, created_at')
      .order('created_at', { ascending: false })

    if (search.trim()) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: profiles, error } = await query

    if (error) throw error

    return NextResponse.json({ ok: true, profiles })
  } catch (error: unknown) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users
 * Update role or ban status
 * Body: { id: string, action: 'role' | 'ban', role?: string, banned?: boolean }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  try {
    const body = await request.json()
    const { id, action, role, banned } = body

    if (!id || !action) {
      return NextResponse.json({ ok: false, error: 'Missing id or action' }, { status: 400 })
    }

    if (action === 'role') {
      if (!role || !['user', 'admin', 'supervisor'].includes(role)) {
        return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 })
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id)

      if (error) throw error
    } else if (action === 'ban') {
      if (typeof banned !== 'boolean') {
        return NextResponse.json({ ok: false, error: 'Invalid banned value' }, { status: 400 })
      }

      const { error } = await supabase
        .from('profiles')
        .update({ banned })
        .eq('id', id)

      if (error) throw error
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
