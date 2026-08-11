import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Check HTTP Basic Auth first (keeps existing admin access working)
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD

  if (username && password) {
    const authHeader = request.headers.get('authorization')

    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64 = authHeader.slice('Basic '.length)
      const decoded = Buffer.from(base64, 'base64').toString('utf-8')
      const colonIndex = decoded.indexOf(':')
      if (colonIndex !== -1) {
        const incomingUser = decoded.slice(0, colonIndex)
        const incomingPass = decoded.slice(colonIndex + 1)
        if (incomingUser === username && incomingPass === password) {
          return NextResponse.next()
        }
      }
    }
  }

  // Try Supabase session + role check
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // Check if user has admin or supervisor role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'supervisor') {
      return response
    }
  }

  // Neither auth method succeeded - require HTTP Basic Auth
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="4CIMA Admin", charset="UTF-8"',
    },
  })
}

export const config = {
  matcher: [
    '/admin',
    '/admin/(.*)',
    '/api/admin',
    '/api/admin/(.*)',
  ],
}
