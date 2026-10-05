import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { signPlayerToken } from '@/lib/player-bridge';
import { guard } from '@/lib/rateLimit';

export const runtime = 'nodejs'

// Issue a short-lived signed player bridge token for the current session
// (same-origin on 4cima.com). The token is appended to the player watch
// URL as ?pt=… and verified by /api/player/* endpoints only.
export async function GET(req: NextRequest) {
  // حد قراءة الجلسة + التوقيع (تدقيق أمني 2026-10-04) — الاستخدام الطبيعي
  // طلب/مشاهدة، والـ60 لكل IP مصادرة على أي عبث.
  const limited = guard(req, 'player-bridge', 60);
  if (limited) return limited;
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const token = await signPlayerToken(user);
    return NextResponse.json({
      ok: true,
      token,
      name: user.name || '',
      avatar: user.avatar_url || '',
    });
  } catch {
    return NextResponse.json({ error: 'Bridge not configured' }, { status: 500 });
  }
}
