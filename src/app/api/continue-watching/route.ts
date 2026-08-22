import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await executeAll(
    `SELECT * FROM watch_history WHERE user_id = ? AND completed = 0 ORDER BY watch_date DESC LIMIT 30`,
    [user.id]
  );
  return NextResponse.json({ ok: true, items: rows });
}
