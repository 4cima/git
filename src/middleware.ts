import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';

const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || 'unknown';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.headers.set('x-build-sha', BUILD_SHA);

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') ||
                       request.nextUrl.pathname.startsWith('/api/admin');
  if (!isAdminRoute) return response;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64 = authHeader.slice('Basic '.length);
      const decoded = atob(base64);
      const colonIndex = decoded.indexOf(':');
      if (colonIndex !== -1) {
        if (decoded.slice(0, colonIndex) === username && decoded.slice(colonIndex + 1) === password) {
          return response;
        }
      }
    }
  }

  try {
    const user = await getCurrentUser(request);
    if (user && (user.role === 'admin' || user.role === 'supervisor')) {
      return response;
    }
  } catch (error) {
    console.error('D1 auth check failed:', error);
  }

  return NextResponse.redirect(
    new URL('/login?redirect=' + encodeURIComponent(request.nextUrl.pathname), request.url)
  );
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
