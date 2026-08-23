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

// Get card states for multiple items
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCompletedWatchTable();

  const body = await request.json().catch(() => null);
  if (!body?.items || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const states: Record<string, 'neutral' | 'favorite' | 'completed'> = {};

  for (const item of body.items) {
    const key = `${item.content_type}-${item.tmdb_id}`;
    
    // Check if in favorites
    const fav = await executeFirst<{id: number}>(
      `SELECT id FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`,
      [user.id, item.content_type, item.tmdb_id]
    );
    
    if (fav) {
      states[key] = 'favorite';
      continue;
    }
    
    // Check if completed
    const comp = await executeFirst<{id: number}>(
      `SELECT id FROM completed_watch WHERE user_id=? AND content_type=? AND tmdb_id=?`,
      [user.id, item.content_type, item.tmdb_id]
    );
    
    if (comp) {
      states[key] = 'completed';
      continue;
    }
    
    states[key] = 'neutral';
  }

  return NextResponse.json({ ok: true, states });
}
