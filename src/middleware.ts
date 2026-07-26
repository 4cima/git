import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD

  if (!username || !password) {
    return new NextResponse('Admin credentials not configured', { status: 503 })
  }

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