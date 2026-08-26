import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

type ActivityItem = {
  type: 'watch' | 'favorite' | 'review';
  tmdb_id: number;
  content_type: string;
  title: string | null;
  poster_path: string | null;
  slug?: string | null;
  date: string;
  data: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);
  const activities: ActivityItem[] = [];
  const raw: Record<string, unknown> = {};

  if (type === 'all' || type === 'watch_history') {
    const rows = await executeAll<any>(
      `SELECT id, content_type, content_id, tmdb_id, title, poster_path,
              watch_date, watch_duration, completed, season_number, episode_number
       FROM watch_history WHERE user_id = ? ORDER BY watch_date DESC LIMIT ?`,
      [user.id, limit]
    );
    raw.watch_history = rows;
    for (const r of rows) {
      activities.push({ type: 'watch', tmdb_id: r.tmdb_id, content_type: r.content_type, title: r.title, poster_path: r.poster_path, date: r.watch_date, slug: null, data: r });
    }
  }

  if (type === 'all' || type === 'favorites') {
    const rows = await executeAll<any>(
      `SELECT id, content_type, content_id, tmdb_id, title, poster_path, added_at
       FROM favorites WHERE user_id = ? ORDER BY added_at DESC LIMIT ?`,
      [user.id, limit]
    );
    raw.favorites = rows;
    for (const r of rows) {
      activities.push({ type: 'favorite', tmdb_id: r.tmdb_id, content_type: r.content_type, title: r.title, poster_path: r.poster_path, date: r.added_at, slug: null, data: r });
    }
  }

  if (type === 'all' || type === 'reviews') {
    const rows = await executeAll<any>(
      `SELECT id, content_type, content_id, tmdb_id, title, rating, review_text, created_at, updated_at
       FROM user_reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [user.id, limit]
    );
    raw.reviews = rows;
    for (const r of rows) {
      activities.push({ type: 'review', tmdb_id: r.tmdb_id, content_type: r.content_type, title: r.title, poster_path: null, date: r.created_at, slug: null, data: r });
    }
  }

  activities.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return NextResponse.json({ ok: true, activities, ...raw });
}
