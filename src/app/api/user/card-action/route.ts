import { NextRequest, NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

// Toggle card state: neutral → favorite → completed → neutral
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
