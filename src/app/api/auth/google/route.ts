import { NextRequest, NextResponse } from 'next/server';
import { beginGoogleAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const auth   = await beginGoogleAuth(origin);
  const res    = NextResponse.redirect(auth.url);
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

  // Optional post-login redirect target: only 4cima.stream origins are
  // accepted (the player). Stored in a short-lived httpOnly cookie.
  const next = req.nextUrl.searchParams.get('next') || '';
  if (next && /^https:\/\/(www\.)?4cima\.stream\//.test(next)) {
    res.cookies.set('auth_next', next, {
      httpOnly: true,
      secure:   !isLocalhost,
      sameSite: 'lax',
      path:     '/',
      maxAge:   600, // ten minutes
    });
  }

  res.cookies.set('oauth_state', auth.state, {
    httpOnly: true,
    secure:   !isLocalhost, // false on localhost, true on production
    sameSite: 'lax',
    path:     '/',
    maxAge:   600,
  });
  return res;
}
