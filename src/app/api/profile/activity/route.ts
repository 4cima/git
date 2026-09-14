import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

type ActivityItem = {
  type: 'watch' | 'favorite' | 'review';
  tmdb_id: number;
  content_type: string;
  title: string | null;
  title_ar?: string | null;
  poster_path: string | null;
  vote_average?: number | null;
  slug?: string | null;
  date: string;
  data: Record<string, unknown>;
};

const isTextSlug = (s: unknown): s is string =>
  typeof s === 'string' && s.trim() !== '' && !/^\d+$/.test(s.trim());

/** توحيد النوع: series → tv (كل الكود الجديد يستخدم movie/tv) */
const normType = (t: unknown): string => {
  const s = String(t || '').toLowerCase();
  if (s === 'movie') return 'movie';
  return 'tv';
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);
  const activities: ActivityItem[] = [];

  if (type === 'all' || type === 'watch_history') {
    const rows = await executeAll<any>(
      `SELECT w.id, w.content_type, w.content_id, w.tmdb_id, w.title, w.poster_path,
              w.watch_date, w.watch_duration, w.completed, w.season_number, w.episode_number,
              COALESCE(m.slug, t.slug) AS slug,
              COALESCE(m.title_ar, t.name_ar) AS title_ar,
              COALESCE(m.vote_average, t.vote_average) AS vote_average
       FROM watch_history w
       LEFT JOIN movies m ON m.tmdb_id = w.tmdb_id AND w.content_type = 'movie'
       LEFT JOIN tv_series t ON t.tmdb_id = w.tmdb_id AND w.content_type IN ('tv', 'series')
       WHERE w.user_id = ? ORDER BY w.watch_date DESC LIMIT ?`,
      [user.id, limit]
    );
    for (const r of rows) {
      activities.push({
        type: 'watch', tmdb_id: r.tmdb_id, content_type: normType(r.content_type),
        title: r.title_ar || r.title || null, title_ar: r.title_ar || null,
        poster_path: r.poster_path || null, vote_average: r.vote_average ?? null,
        date: r.watch_date, slug: isTextSlug(r.slug) ? r.slug.trim() : null, data: r,
      });
    }
  }

  if (type === 'all' || type === 'favorites') {
    const rows = await executeAll<any>(
      `SELECT f.id, f.content_type, f.content_id, f.tmdb_id, f.title, f.poster_path, f.added_at,
              COALESCE(m.slug, t.slug) AS slug,
              COALESCE(m.title_ar, t.name_ar) AS title_ar,
              COALESCE(m.vote_average, t.vote_average) AS vote_average
       FROM favorites f
       LEFT JOIN movies m ON m.tmdb_id = f.tmdb_id AND f.content_type = 'movie'
       LEFT JOIN tv_series t ON t.tmdb_id = f.tmdb_id AND f.content_type IN ('tv', 'series')
       WHERE f.user_id = ? ORDER BY f.added_at DESC LIMIT ?`,
      [user.id, limit]
    );
    for (const r of rows) {
      activities.push({
        type: 'favorite', tmdb_id: r.tmdb_id, content_type: normType(r.content_type),
        title: r.title_ar || r.title || null, title_ar: r.title_ar || null,
        poster_path: r.poster_path || null, vote_average: r.vote_average ?? null,
        date: r.added_at, slug: isTextSlug(r.slug) ? r.slug.trim() : null, data: r,
      });
    }
  }

  if (type === 'all' || type === 'reviews') {
    const rows = await executeAll<any>(
      `SELECT r.id, r.content_type, r.content_id, r.tmdb_id, r.title, r.rating,
              r.review_text, r.created_at, r.updated_at,
              COALESCE(m.slug, t.slug) AS slug,
              COALESCE(m.title_ar, t.name_ar) AS title_ar,
              COALESCE(m.poster_path, t.poster_path) AS poster_path
       FROM user_reviews r
       LEFT JOIN movies m ON m.tmdb_id = r.tmdb_id AND r.content_type = 'movie'
       LEFT JOIN tv_series t ON t.tmdb_id = r.tmdb_id AND r.content_type IN ('tv', 'series')
       WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT ?`,
      [user.id, limit]
    );
    for (const r of rows) {
      activities.push({
        type: 'review', tmdb_id: r.tmdb_id, content_type: normType(r.content_type),
        title: r.title_ar || r.title || null, title_ar: r.title_ar || null,
        poster_path: r.poster_path || null, vote_average: null,
        date: r.created_at, slug: isTextSlug(r.slug) ? r.slug.trim() : null, data: r,
      });
    }
  }

  activities.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return NextResponse.json(
    { ok: true, activities },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

