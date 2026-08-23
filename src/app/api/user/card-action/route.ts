import { NextRequest, NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

// Ensure completed_watch table exists
let tableEnsured = false;
async function ensureCompletedWatchTable() {
  if (tableEnsured) return;
  try {
    await executeAll(`
      CREATE TABLE IF NOT EXISTS completed_watch (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        tmdb_id INTEGER NOT NULL,
        title TEXT,
        poster_path TEXT,
        added_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, content_type, tmdb_id)
      )
    `);
    await executeAll(`CREATE INDEX IF NOT EXISTS idx_completed_watch_user ON completed_watch(user_id)`);
    tableEnsured = true;
  } catch (error) {
    // Table might already exist
  }
}

// Toggle card state: neutral → favorite → completed → neutral
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCompletedWatchTable();

  const body = await request.json().catch(() => null);
  if (!body?.content_type || !body?.tmdb_id) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { content_type, tmdb_id, title, poster_path } = body;

  // Check current state
  const fav = await executeFirst<{id: number}>(
    `SELECT id FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`,
    [user.id, content_type, tmdb_id]
  );

  if (fav) {
    // Current: favorite → Move to completed
    await executeAll(
      `DELETE FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`,
      [user.id, content_type, tmdb_id]
    );
    
    await executeAll(
      `INSERT OR IGNORE INTO completed_watch (user_id, content_type, tmdb_id, title, poster_path) 
       VALUES (?,?,?,?,?)`,
      [user.id, content_type, tmdb_id, title || null, poster_path || null]
    );
    
    return NextResponse.json({ ok: true, newState: 'completed' });
  }

  const comp = await executeFirst<{id: number}>(
    `SELECT id FROM completed_watch WHERE user_id=? AND content_type=? AND tmdb_id=?`,
    [user.id, content_type, tmdb_id]
  );

  if (comp) {
    // Current: completed → Move to neutral
    await executeAll(
      `DELETE FROM completed_watch WHERE user_id=? AND content_type=? AND tmdb_id=?`,
      [user.id, content_type, tmdb_id]
    );
    
    return NextResponse.json({ ok: true, newState: 'neutral' });
  }

  // Current: neutral → Move to favorite
  await executeAll(
    `INSERT OR IGNORE INTO favorites (user_id, content_type, content_id, tmdb_id, title, poster_path) 
     VALUES (?,?,?,?,?,?)`,
    [user.id, content_type, 0, tmdb_id, title || null, poster_path || null]
  );

  return NextResponse.json({ ok: true, newState: 'favorite' });
}
