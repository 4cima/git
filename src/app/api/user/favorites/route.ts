import { NextRequest, NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b?.content_type || !b?.tmdb_id) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

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
  return NextResponse.json({ ok: true, added: !has });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = new URL(request.url);
  const tmdbId = parseInt(u.searchParams.get('tmdb_id')||'0',10);
  const type = u.searchParams.get('content_type');
  if (!tmdbId || !type) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  await executeAll(`DELETE FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`, [user.id, type, tmdbId]);
  return NextResponse.json({ ok: true, removed: true });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await executeAll(
    `SELECT * FROM favorites WHERE user_id=? ORDER BY added_at DESC LIMIT 50`, [user.id]
  );
  return NextResponse.json({ ok: true, items: rows });
}
