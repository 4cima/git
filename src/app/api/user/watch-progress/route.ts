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

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = await request.json().catch(() => null);
  if (!b?.content_type || !b?.tmdb_id) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  // Check rate limit
  const allowed = await checkRateLimit(user.id, 'watch', b.tmdb_id);
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const existing = await executeFirst<{id:number}>(
    `SELECT id FROM watch_history WHERE user_id=? AND content_type=? AND tmdb_id=? AND COALESCE(season_number,0)=? AND COALESCE(episode_number,0)=?`,
    [user.id, b.content_type, b.tmdb_id, b.season_number||0, b.episode_number||0]
  );

  if (existing) {
    await executeAll(
      `UPDATE watch_history SET watch_duration=?, completed=?, watch_date=datetime('now'), title=COALESCE(?,title), poster_path=COALESCE(?,poster_path) WHERE id=?`,
      [b.watch_duration||0, b.completed?1:0, b.title||null, b.poster_path||null, existing.id]
    );
  } else {
    await executeAll(
      `INSERT INTO watch_history (user_id, content_type, content_id, tmdb_id, title, poster_path, watch_duration, completed, season_number, episode_number)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [user.id, b.content_type, b.content_id||0, b.tmdb_id, b.title||null, b.poster_path||null, b.watch_duration||0, b.completed?1:0, b.season_number||null, b.episode_number||null]
    );
  }
  
  // Log rate event
  await logRateEvent(user.id, 'watch', b.tmdb_id);
  
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await executeAll(
    `SELECT * FROM watch_history WHERE user_id=? ORDER BY watch_date DESC LIMIT 50`, [user.id]
  );
  return NextResponse.json({ ok: true, items: rows });
}
