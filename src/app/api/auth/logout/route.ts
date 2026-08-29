import { NextRequest, NextResponse } from 'next/server';
import { killSession, SESSION_COOKIE } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  await killSession(req);
  // Optional post-logout redirect: 4cima.stream / 4cima.com / relative "/".
  // When returning to the player, session params (who/avatar/pt) are stripped
  // so no stale identity remains in the URL.
  const next = req.nextUrl.searchParams.get('next') || '';
  let target = '/';
  if (next && /^(https:\/\/(www\.)?4cima\.(stream|com)\/|\/)/i.test(next)) {
    if (/^https:\/\/(www\.)?4cima\.stream\//i.test(next)) {
      try {
        const u = new URL(next);
        u.searchParams.delete('who');
        u.searchParams.delete('avatar');
        u.searchParams.delete('pt');
        target = u.toString();
      } catch {
        target = '/';
      }
    } else {
      target = next;
    }
  }
  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
