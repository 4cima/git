import { NextRequest, NextResponse } from 'next/server';
import { executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tables = ['watch_history', 'favorites', 'user_reviews', 'user_achievements'] as const;
  const stats: Record<string, number> = {};

  for (const table of tables) {
    const row = await executeFirst<{ c: number }>(
      `SELECT COUNT(*) AS c FROM ${table} WHERE user_id = ?`,
      [user.id]
    );
    stats[table] = row?.c ?? 0;
  }

  return NextResponse.json({ ok: true, stats });
}
