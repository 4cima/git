import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';
import { guard } from '@/lib/rateLimit';

const isTextSlug = (s: unknown): s is string =>
  typeof s === 'string' && s.trim() !== '' && !/^\d+$/.test(s.trim());

/**
 * GET /api/user/reviews — تقييمات المستخدم مع بيانات العرض (slug/بوستر/عنوان عربي)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100);

  const rows = await executeAll(
    `SELECT r.content_type, r.content_id, r.tmdb_id, r.title, r.rating,
            r.review_text, r.created_at, r.updated_at,
            COALESCE(m.slug, t.slug) AS slug,
            COALESCE(m.title_ar, t.name_ar) AS title_ar,
            COALESCE(m.title_en, t.name_en) AS title_en,
            COALESCE(m.poster_path, t.poster_path) AS poster_path,
            COALESCE(m.vote_average, t.vote_average) AS vote_average
     FROM user_reviews r
     LEFT JOIN movies m ON m.tmdb_id = r.tmdb_id AND r.content_type = 'movie'
     LEFT JOIN tv_series t ON t.tmdb_id = r.tmdb_id AND r.content_type IN ('tv', 'series')
     WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT ?`,
    [user.id, limit]
  );

  const items = (rows as any[]).map((r) => ({
    ...r,
    content_type: r.content_type === 'movie' ? 'movie' : 'tv',
    slug: isTextSlug(r.slug) ? String(r.slug).trim() : null,
  }));

  return NextResponse.json(
    { ok: true, items },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export async function POST(request: NextRequest) {
  const limited = guard(request, 'user', 30);
  if (limited) return limited;
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b?.content_type || !b?.tmdb_id || !b?.rating) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const ctype = b.content_type === 'movie' ? 'movie' : 'tv';
  const rating = Math.min(10, Math.max(0, Number(b.rating) || 0));

  await executeAll(`DELETE FROM user_reviews WHERE user_id=? AND content_type IN (?, 'series', 'tv') AND tmdb_id=?`, [user.id, ctype, b.tmdb_id]);
  await executeAll(
    `INSERT INTO user_reviews (user_id, username, content_type, content_id, tmdb_id, title, rating, review_text) VALUES (?,?,?,?,?,?,?,?)`,
    [user.id, user.name||user.email, ctype, b.content_id||0, b.tmdb_id, b.title||null, rating, b.review_text||null]
  );
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/user/reviews?tmdb_id=&content_type= — حذف تقييم
 */
export async function DELETE(request: NextRequest) {
  const limited = guard(request, 'user', 30);
  if (limited) return limited;
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = new URL(request.url);
  const tmdbId = parseInt(u.searchParams.get('tmdb_id') || '0', 10);
  if (!tmdbId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  await executeAll(
    `DELETE FROM user_reviews WHERE user_id=? AND tmdb_id=?`,
    [user.id, tmdbId]
  );
  return NextResponse.json({ ok: true, removed: true });
}

