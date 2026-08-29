import { NextRequest, NextResponse } from 'next/server';
import { handleAuthCallback, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth-server';
import { signPlayerToken } from '@/lib/player-bridge';

export async function GET(req: NextRequest) {
  const result = await handleAuthCallback(req);

  if (!result?.sessionId) {
    const res = NextResponse.redirect(new URL('/login?error=google', req.url));
    res.cookies.delete('oauth_state');
    return res;
  }

  const isLocalhost = req.url.includes('localhost') || req.url.includes('127.0.0.1');

  // Post-login redirect target — validated on read (stream, 4cima.com or
  // relative path starting with "/" only; open-redirect protection).
  const rawNext = req.cookies.get('auth_next')?.value || '';
  const nextOk = !!rawNext && /^(https:\/\/(www\.)?4cima\.(stream|com)\/|\/)/i.test(rawNext);
  const toStream = !!rawNext && /^https:\/\/(www\.)?4cima\.stream\//i.test(rawNext);
  const display = result.user?.name?.trim() || '';
  const avatarUrl = (result.user?.avatar_url || '').trim();
  let target = '/';
  if (nextOk && rawNext) {
    if (toStream) {
      // Back to the player: display name + avatar (public values) plus the
      // short-lived signed player bridge token for the watch-page heart.
      const extra = new URLSearchParams();
      if (display) extra.set('who', display);
      if (avatarUrl) extra.set('avatar', avatarUrl);
      try { extra.set('pt', await signPlayerToken(result.user!)); } catch { /* no bridge */ }
      const qs = extra.toString();
      target = rawNext + (qs ? (rawNext.includes('?') ? '&' : '?') + qs : '');
    } else {
      target = rawNext;
    }
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
