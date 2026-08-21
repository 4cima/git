import { NextRequest, NextResponse } from 'next/server';
import { killSession, SESSION_COOKIE } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  await killSession(req);
  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
