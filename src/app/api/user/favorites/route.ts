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
  const content_type = b.content_type === 'movie' ? 'movie' : 'tv';
  const tmdb_id = Number(b.tmdb_id) || 0;
  if (!tmdb_id) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  // Check rate limit
  const allowed = await checkRateLimit(user.id, 'favorite', b.tmdb_id);
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const has = await executeFirst<{id:number}>(
    `SELECT id FROM favorites WHERE user_id=? AND tmdb_id=?`,
    [user.id, tmdb_id]
  );
  if (!has) {
    await executeAll(
      `INSERT INTO favorites (user_id, content_type, content_id, tmdb_id, title, poster_path) VALUES (?,?,?,?,?,?)`,
      [user.id, content_type, b.content_id||0, tmdb_id, b.title||null, b.poster_path||null]
    );
  }
  
  // Log rate event
  await logRateEvent(user.id, 'favorite', tmdb_id);
  
  return NextResponse.json({ ok: true, added: !has });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = new URL(request.url);
  const tmdbId = parseInt(u.searchParams.get('tmdb_id')||'0',10);
  const type = u.searchParams.get('content_type');
  if (!tmdbId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  
  // Check rate limit
  const allowed = await checkRateLimit(user.id, 'favorite', tmdbId);
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  
  // حذف بأي content_type قديم (movie/tv/series) — نفس العنصر لا يتكرر
  await executeAll(`DELETE FROM favorites WHERE user_id=? AND tmdb_id=?`, [user.id, tmdbId]);
  
  // Log rate event
  await logRateEvent(user.id, 'favorite', tmdbId);
  
  return NextResponse.json({ ok: true, removed: true });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const u = new URL(request.url);
  const tmdbId = u.searchParams.get('tmdb_id');
  
  // Check if specific item is favorited (بأي content_type قديم)
  if (tmdbId) {
    const item = await executeFirst<{id:number}>(
      `SELECT id FROM favorites WHERE user_id=? AND tmdb_id=?`,
      [user.id, parseInt(tmdbId, 10)]
    );
    return NextResponse.json({ ok: true, isFavorite: !!item });
  }
  
  // Return all favorites with full card fields — ندعم series القديمة كأنها tv
  const rows = await executeAll(
    `SELECT
        f.tmdb_id,
        CASE WHEN f.content_type = 'movie' THEN 'movie' ELSE 'tv' END as content_type,
        f.title,
        f.poster_path,
        f.added_at,
        CASE 
          WHEN f.content_type = 'movie' THEN m.slug
          ELSE t.slug
        END as slug,
        CASE 
          WHEN f.content_type = 'movie' THEN m.title_ar
          ELSE t.name_ar
        END as title_ar,
        CASE 
          WHEN f.content_type = 'movie' THEN m.title_en
          ELSE t.name_en
        END as title_en,
        CASE 
          WHEN f.content_type = 'movie' THEN m.vote_average
          ELSE t.vote_average
        END as vote_average,
        CASE 
          WHEN f.content_type = 'movie' THEN m.release_year
          ELSE t.first_air_year
        END as release_year,
        CASE 
          WHEN f.content_type = 'movie' THEN m.overview_ar
          ELSE t.overview_ar
        END as overview_ar,
        CASE 
          WHEN f.content_type = 'movie' THEN m.genres_json
          ELSE t.genres_json
        END as genres_json,
        CASE 
          WHEN f.content_type = 'movie' THEN m.primary_genre
          ELSE t.primary_genre
        END as primary_genre,
        CASE WHEN f.content_type = 'movie' THEN 'movie' ELSE 'tv' END as media_type
     FROM favorites f
     LEFT JOIN movies m ON m.tmdb_id = f.tmdb_id AND f.content_type = 'movie'
     LEFT JOIN tv_series t ON t.tmdb_id = f.tmdb_id AND f.content_type IN ('tv', 'series')
     WHERE f.user_id = ?
     ORDER BY f.added_at DESC
     LIMIT 100`,
    [user.id]
  );
  const items = (rows as any[]).map((r) => ({
    ...r,
    slug: typeof r.slug === 'string' && r.slug.trim() !== '' && !/^\d+$/.test(r.slug.trim())
      ? r.slug.trim() : null,
  }));
  return NextResponse.json(
    { ok: true, items },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
