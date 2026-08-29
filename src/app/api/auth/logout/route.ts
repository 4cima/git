import { NextRequest, NextResponse } from 'next/server';
import { killSession, SESSION_COOKIE } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  await killSession(req);
  // Optional post-logout redirect target — 4cima.stream only, else '/'.
  const next = req.nextUrl.searchParams.get('next') || '';
  const target = next && /^https:\/\/(www\.)?4cima\.stream\//.test(next) ? next : '/';
  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
