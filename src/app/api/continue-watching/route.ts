import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

const isTextSlug = (s: unknown): s is string =>
  typeof s === 'string' && s.trim() !== '' && !/^\d+$/.test(s.trim());

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 50);

  // عناصر غير مكتملة فقط، مع بيانات العرض — بدون أي تخمين للنسبة هنا
  const rows = await executeAll<any>(
    `SELECT w.content_type, w.content_id, w.tmdb_id, w.title, w.poster_path,
            w.watch_date AS updated_at, w.watch_duration AS progress,
            w.completed, w.season_number AS season, w.episode_number AS episode,
            COALESCE(m.slug, t.slug) AS slug,
            COALESCE(m.title_ar, t.name_ar) AS title_ar,
            COALESCE(m.title_en, t.name_en) AS title_en,
            COALESCE(m.vote_average, t.vote_average) AS vote_average,
            COALESCE(m.backdrop_path, t.backdrop_path) AS backdrop_path
     FROM watch_history w
     LEFT JOIN movies m ON m.tmdb_id = w.tmdb_id AND w.content_type = 'movie'
     LEFT JOIN tv_series t ON t.tmdb_id = w.tmdb_id AND w.content_type IN ('tv', 'series')
     WHERE w.user_id = ? AND COALESCE(w.completed, 0) = 0
     ORDER BY w.watch_date DESC LIMIT ?`,
    [user.id, limit]
  );

  const items = rows.map((r) => {
    const content_type = r.content_type === 'movie' ? 'movie' : 'tv';
    // meta بالشكل الذي يتوقعه ContinueWatchingRow الحالي + حقول موسعة للصفحة الجديدة
    return {
      ...r,
      content_type,
      slug: isTextSlug(r.slug) ? String(r.slug).trim() : null,
      duration: null as number | null, // لا مدة كلية مخزنة — الواجهة تعرض آخر موضع فقط
      meta: {
        id: r.content_id || r.tmdb_id,
        slug: isTextSlug(r.slug) ? String(r.slug).trim() : null,
        poster_path: r.poster_path || null,
        title: r.title_ar || r.title || null,
        name: r.title_ar || r.title || null,
        vote_average: r.vote_average ?? null,
        media_type: content_type,
      },
    };
  });

  return NextResponse.json(
    { ok: true, items },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

/**
 * DELETE /api/continue-watching?tmdb_id=&content_type=[&season=&episode=]
 * إزالة عنصر من "أكمل المشاهدة" (حذف صف watch_history غير المكتمل).
 */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const u = new URL(request.url);
  const tmdbId = parseInt(u.searchParams.get('tmdb_id') || '0', 10);
  if (!tmdbId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const season = u.searchParams.get('season');
  const episode = u.searchParams.get('episode');

  if (season != null || episode != null) {
    await executeAll(
      `DELETE FROM watch_history
       WHERE user_id = ? AND tmdb_id = ?
         AND COALESCE(season_number, 0) = ? AND COALESCE(episode_number, 0) = ?`,
      [user.id, tmdbId, parseInt(season || '0', 10) || 0, parseInt(episode || '0', 10) || 0]
    );
  } else {
    await executeAll(
      `DELETE FROM watch_history WHERE user_id = ? AND tmdb_id = ? AND COALESCE(completed, 0) = 0`,
      [user.id, tmdbId]
    );
  }

  return NextResponse.json({ ok: true, removed: true });
}

