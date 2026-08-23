import { NextRequest, NextResponse } from 'next/server';
import { executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stats: Record<string, number> = {};

  // Get counts for favorites, reviews, achievements
  const tables = ['favorites', 'user_reviews', 'user_achievements'] as const;
  for (const table of tables) {
    const row = await executeFirst<{ c: number }>(
      `SELECT COUNT(*) AS c FROM ${table} WHERE user_id = ?`,
      [user.id]
    );
    stats[table] = row?.c ?? 0;
  }

  // Get watch history stats (count and total duration in minutes)
  const watchStats = await executeFirst<{ count: number; total_duration: number }>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(watch_duration), 0) AS total_duration 
     FROM watch_history WHERE user_id = ?`,
    [user.id]
  );
  stats['watch_history'] = watchStats?.count ?? 0;
  stats['total_watch_duration_minutes'] = watchStats?.total_duration ?? 0;

  return NextResponse.json({ ok: true, stats });
}
