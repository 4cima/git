import { NextRequest, NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = await request.json().catch(() => null);
  if (!b?.content_type || !b?.tmdb_id) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

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
