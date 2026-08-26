import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const rows = await executeAll(
    `SELECT 
        c.tmdb_id,
        c.content_type,
        c.title,
        c.poster_path,
        c.added_at,
        CASE 
          WHEN c.content_type = 'movie' THEN m.slug
          WHEN c.content_type = 'tv' THEN t.slug
          ELSE NULL
        END as slug,
        CASE 
          WHEN c.content_type = 'movie' THEN m.title_ar
          WHEN c.content_type = 'tv' THEN t.name_ar
          ELSE NULL
        END as title_ar,
        CASE 
          WHEN c.content_type = 'movie' THEN m.title_en
          WHEN c.content_type = 'tv' THEN t.name_en
          ELSE NULL
        END as title_en,
        CASE 
          WHEN c.content_type = 'movie' THEN m.vote_average
          WHEN c.content_type = 'tv' THEN t.vote_average
          ELSE NULL
        END as vote_average,
        CASE 
          WHEN c.content_type = 'movie' THEN m.release_year
          WHEN c.content_type = 'tv' THEN t.first_air_year
          ELSE NULL
        END as release_year,
        CASE 
          WHEN c.content_type = 'movie' THEN m.overview_ar
          WHEN c.content_type = 'tv' THEN t.overview_ar
          ELSE NULL
        END as overview_ar,
        CASE 
          WHEN c.content_type = 'movie' THEN m.genres_json
          WHEN c.content_type = 'tv' THEN t.genres_json
          ELSE NULL
        END as genres_json,
        CASE 
          WHEN c.content_type = 'movie' THEN m.primary_genre
          WHEN c.content_type = 'tv' THEN t.primary_genre
          ELSE NULL
        END as primary_genre,
        c.content_type as media_type
     FROM completed_watch c
     LEFT JOIN movies m ON m.tmdb_id = c.tmdb_id AND c.content_type = 'movie'
     LEFT JOIN tv_series t ON t.tmdb_id = c.tmdb_id AND c.content_type = 'tv'
     WHERE c.user_id = ?
     ORDER BY c.added_at DESC 
     LIMIT 100`, 
    [user.id]
  );
  
  return NextResponse.json({ ok: true, items: rows });
}
