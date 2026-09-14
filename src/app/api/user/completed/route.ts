import { NextRequest, NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = new URL(request.url);
  const oneId = q.searchParams.get('tmdb_id');
  if (oneId) {
    const one = await executeFirst<{ id: number }>(
      `SELECT id FROM completed_watch WHERE user_id=? AND tmdb_id=?`,
      [user.id, parseInt(oneId, 10)]
    );
    return NextResponse.json({ ok: true, isCompleted: !!one });
  }

  const rows = await executeAll(
    `SELECT
        c.tmdb_id,
        CASE WHEN c.content_type = 'movie' THEN 'movie' ELSE 'tv' END as content_type,
        c.title,
        c.poster_path,
        c.added_at,
        CASE 
          WHEN c.content_type = 'movie' THEN m.slug
          ELSE t.slug
        END as slug,
        CASE 
          WHEN c.content_type = 'movie' THEN m.title_ar
          ELSE t.name_ar
        END as title_ar,
        CASE 
          WHEN c.content_type = 'movie' THEN m.title_en
          ELSE t.name_en
        END as title_en,
        CASE 
          WHEN c.content_type = 'movie' THEN m.vote_average
          ELSE t.vote_average
        END as vote_average,
        CASE 
          WHEN c.content_type = 'movie' THEN m.release_year
          ELSE t.first_air_year
        END as release_year,
        CASE 
          WHEN c.content_type = 'movie' THEN m.overview_ar
          ELSE t.overview_ar
        END as overview_ar,
        CASE 
          WHEN c.content_type = 'movie' THEN m.genres_json
          ELSE t.genres_json
        END as genres_json,
        CASE 
          WHEN c.content_type = 'movie' THEN m.primary_genre
          ELSE t.primary_genre
        END as primary_genre,
        CASE WHEN c.content_type = 'movie' THEN 'movie' ELSE 'tv' END as media_type
     FROM completed_watch c
     LEFT JOIN movies m ON m.tmdb_id = c.tmdb_id AND c.content_type = 'movie'
     LEFT JOIN tv_series t ON t.tmdb_id = c.tmdb_id AND c.content_type IN ('tv', 'series')
     WHERE c.user_id = ?
     ORDER BY c.added_at DESC
     LIMIT 100`,
    [user.id]
  );

  const items = (rows as any[]).map((r) => ({
    ...r,
    content_type: r.content_type === 'movie' ? 'movie' : 'tv',
    slug: typeof r.slug === 'string' && r.slug.trim() !== '' && !/^\d+$/.test(r.slug.trim())
      ? r.slug.trim() : null,
  }));

  return NextResponse.json(
    { ok: true, items },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
