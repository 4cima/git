import { NextRequest, NextResponse } from 'next/server';
import { beginGoogleAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const auth   = await beginGoogleAuth(origin);
  const res    = NextResponse.redirect(auth.url);
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
  res.cookies.set('oauth_state', auth.state, {
    httpOnly: true,
    secure:   !isLocalhost, // false on localhost, true on production
    sameSite: 'lax',
    path:     '/',
    maxAge:   600,
  });
  return res;
}
