import { NextRequest, NextResponse } from 'next/server';
import { beginGoogleAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const auth   = await beginGoogleAuth(origin);
  const res    = NextResponse.redirect(auth.url);
  res.cookies.set('oauth_state', auth.state, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   600,
  });
  return res;
}
