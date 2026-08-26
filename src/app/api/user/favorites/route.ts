import { NextRequest, NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

// Create rate_events table on first use
let tableCreated = false;
async function ensureRateTable() {
  if (tableCreated) return;
  try {
    await executeAll(`
      CREATE TABLE IF NOT EXISTS rate_events (
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        tmdb_id INTEGER,
        ts TEXT NOT NULL
      )
    `);
    tableCreated = true;
  } catch (error) {
    // Table might already exist
  }
}

async function checkRateLimit(userId: string, kind: string, tmdbId?: number): Promise<boolean> {
  await ensureRateTable();
  
  // Clean old events (older than 2 hours)
  try {
    await executeAll(`DELETE FROM rate_events WHERE ts < datetime('now', '-2 hours') LIMIT 100`);
  } catch {}
  
  // Check user total limit (50/min)
  const userCount = await executeFirst<{cnt: number}>(
    `SELECT COUNT(*) as cnt FROM rate_events WHERE user_id=? AND kind=? AND ts>=datetime('now','-1 minute')`,
    [userId, kind]
  );
  if (userCount && userCount.cnt >= 50) return false;
  
  // Check per-item limit (10/min) if tmdb_id provided
  if (tmdbId !== undefined) {
    const itemCount = await executeFirst<{cnt: number}>(
      `SELECT COUNT(*) as cnt FROM rate_events WHERE user_id=? AND kind=? AND tmdb_id=? AND ts>=datetime('now','-1 minute')`,
      [userId, kind, tmdbId]
    );
    if (itemCount && itemCount.cnt >= 10) return false;
  }
  
  return true;
}

async function logRateEvent(userId: string, kind: string, tmdbId?: number) {
  await ensureRateTable();
  await executeAll(
    `INSERT INTO rate_events (user_id, kind, tmdb_id, ts) VALUES (?,?,?,datetime('now'))`,
    [userId, kind, tmdbId || null]
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b?.content_type || !b?.tmdb_id) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  // Check rate limit
  const allowed = await checkRateLimit(user.id, 'favorite', b.tmdb_id);
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const has = await executeFirst<{id:number}>(
    `SELECT id FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`,
    [user.id, b.content_type, b.tmdb_id]
  );
  if (!has) {
    await executeAll(
      `INSERT INTO favorites (user_id, content_type, content_id, tmdb_id, title, poster_path) VALUES (?,?,?,?,?,?)`,
      [user.id, b.content_type, b.content_id||0, b.tmdb_id, b.title||null, b.poster_path||null]
    );
  }
  
  // Log rate event
  await logRateEvent(user.id, 'favorite', b.tmdb_id);
  
  return NextResponse.json({ ok: true, added: !has });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = new URL(request.url);
  const tmdbId = parseInt(u.searchParams.get('tmdb_id')||'0',10);
  const type = u.searchParams.get('content_type');
  if (!tmdbId || !type) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  
  // Check rate limit
  const allowed = await checkRateLimit(user.id, 'favorite', tmdbId);
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  
  await executeAll(`DELETE FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`, [user.id, type, tmdbId]);
  
  // Log rate event
  await logRateEvent(user.id, 'favorite', tmdbId);
  
  return NextResponse.json({ ok: true, removed: true });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const u = new URL(request.url);
  const tmdbId = u.searchParams.get('tmdb_id');
  const type = u.searchParams.get('content_type');
  
  // Check if specific item is favorited
  if (tmdbId && type) {
    const item = await executeFirst<{id:number}>(
      `SELECT id FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`,
      [user.id, type, parseInt(tmdbId, 10)]
    );
    return NextResponse.json({ ok: true, isFavorite: !!item });
  }
  
  // Return all favorites with full MovieCard fields
  const rows = await executeAll(
    `SELECT 
        f.tmdb_id,
        f.content_type,
        f.title,
        f.poster_path,
        f.added_at,
        CASE 
          WHEN f.content_type = 'movie' THEN m.slug
          WHEN f.content_type = 'tv' THEN t.slug
          ELSE NULL
        END as slug,
        CASE 
          WHEN f.content_type = 'movie' THEN m.title_ar
          WHEN f.content_type = 'tv' THEN t.name_ar
          ELSE NULL
        END as title_ar,
        CASE 
          WHEN f.content_type = 'movie' THEN m.title_en
          WHEN f.content_type = 'tv' THEN t.name_en
          ELSE NULL
        END as title_en,
        CASE 
          WHEN f.content_type = 'movie' THEN m.vote_average
          WHEN f.content_type = 'tv' THEN t.vote_average
          ELSE NULL
        END as vote_average,
        CASE 
          WHEN f.content_type = 'movie' THEN m.release_year
          WHEN f.content_type = 'tv' THEN t.first_air_year
          ELSE NULL
        END as release_year,
        CASE 
          WHEN f.content_type = 'movie' THEN m.overview_ar
          WHEN f.content_type = 'tv' THEN t.overview_ar
          ELSE NULL
        END as overview_ar,
        CASE 
          WHEN f.content_type = 'movie' THEN m.genres_json
          WHEN f.content_type = 'tv' THEN t.genres_json
          ELSE NULL
        END as genres_json,
        CASE 
          WHEN f.content_type = 'movie' THEN m.primary_genre
          WHEN f.content_type = 'tv' THEN t.primary_genre
          ELSE NULL
        END as primary_genre,
        f.content_type as media_type
     FROM favorites f
     LEFT JOIN movies m ON m.tmdb_id = f.tmdb_id AND f.content_type = 'movie'
     LEFT JOIN tv_series t ON t.tmdb_id = f.tmdb_id AND f.content_type = 'tv'
     WHERE f.user_id = ?
     ORDER BY f.added_at DESC 
     LIMIT 100`, 
    [user.id]
  );
  return NextResponse.json({ ok: true, items: rows });
}
