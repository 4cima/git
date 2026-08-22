import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);

  const out: Record<string, unknown> = { ok: true };

  if (type === 'all' || type === 'watch_history') {
    out.watch_history = await executeAll(
      `SELECT id, content_type, content_id, tmdb_id, title, poster_path,
              watch_date, watch_duration, completed, season_number, episode_number
       FROM watch_history WHERE user_id = ? ORDER BY watch_date DESC LIMIT ?`,
      [user.id, limit]
    );
  }
  if (type === 'all' || type === 'favorites') {
    out.favorites = await executeAll(
      `SELECT id, content_type, content_id, tmdb_id, title, poster_path, added_at
       FROM favorites WHERE user_id = ? ORDER BY added_at DESC LIMIT ?`,
      [user.id, limit]
    );
  }
  if (type === 'all' || type === 'reviews') {
    out.reviews = await executeAll(
      `SELECT id, content_type, content_id, tmdb_id, title, rating, review_text, created_at, updated_at
       FROM user_reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [user.id, limit]
    );
  }

  return NextResponse.json(out);
}
