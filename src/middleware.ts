import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Build SHA will be injected at build time
const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || 'unknown'

export async function middleware(request: NextRequest) {
  // Create base response with build SHA header for all requests
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  response.headers.set('x-build-sha', BUILD_SHA)

  // Only apply admin auth checks for admin routes
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') || 
                       request.nextUrl.pathname.startsWith('/api/admin')
  
  if (!isAdminRoute) {
    return response
  }

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
          return response
        }
      }
    }
  }

  // Try Supabase session + role check with timeout for admin routes

  try {
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

    // Add timeout to prevent hanging
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), 3000)
    )

    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any

    if (session) {
      // Check if user has admin or supervisor role with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile timeout')), 2000)
      )

      const { data: profile } = await Promise.race([profilePromise, profileTimeout]) as any

      if (profile?.role === 'admin' || profile?.role === 'supervisor') {
        return response
      }
    }
  } catch (error) {
    // Auth check failed or timed out - redirect to login
    console.error('Admin auth check failed:', error)
    return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
  }

  // No valid session - redirect to login
  return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
