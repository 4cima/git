import { NextRequest, NextResponse } from 'next/server';
import { handleAuthCallback, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const result = await handleAuthCallback(req);

  if (!result?.sessionId) {
    const res = NextResponse.redirect(new URL('/login?error=google', req.url));
    res.cookies.delete('oauth_state');
    return res;
  }

  const res = NextResponse.redirect(new URL('/', req.url));
  const isLocalhost = req.url.includes('localhost') || req.url.includes('127.0.0.1');
  res.cookies.set(SESSION_COOKIE, result.sessionId, {
    httpOnly: true,
    secure:   !isLocalhost, // false on localhost, true on production
    sameSite: 'lax',
    path:     '/',
    maxAge:   SESSION_MAX_AGE,
  });
  res.cookies.delete('oauth_state');
  return res;
}
