import { NextRequest, NextResponse } from 'next/server';
import { handleAuthCallback, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const result = await handleAuthCallback(req);

  if (!result?.sessionId) {
    const res = NextResponse.redirect(new URL('/login?error=google', req.url));
    res.cookies.delete('oauth_state');
    return res;
  }

  const isLocalhost = req.url.includes('localhost') || req.url.includes('127.0.0.1');

  // Post-login redirect target (player deep link) — validated on read.
  const rawNext = req.cookies.get('auth_next')?.value || '';
  const next = rawNext && /^https:\/\/(www\.)?4cima\.stream\//.test(rawNext) ? rawNext : '';
  const display = result.user?.name?.trim() || '';
  const avatarUrl = (result.user?.avatar_url || '').trim();
  // Attach ?who= (display name) and ?avatar= (profile picture) when
  // returning to the player — both public, non-secret values.
  let target = '/';
  if (next) {
    const extra = new URLSearchParams();
    if (display) extra.set('who', display);
    if (avatarUrl) extra.set('avatar', avatarUrl);
    const qs = extra.toString();
    target = next + (qs ? (next.includes('?') ? '&' : '?') + qs : '');
  }

  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.set(SESSION_COOKIE, result.sessionId, {
    httpOnly: true,
    secure:   !isLocalhost, // false on localhost, true on production
    sameSite: 'lax',
    path:     '/',
    maxAge:   SESSION_MAX_AGE,
  });
  res.cookies.delete('oauth_state');
  res.cookies.delete('auth_next');
  return res;
}
