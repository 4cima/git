import { NextRequest, NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { bearerFrom, playerCors, verifyPlayerToken } from '@/lib/player-bridge';

export const runtime = 'nodejs'

function withCors(body: unknown, req: Request, status = 200) {
  return NextResponse.json(body, { status, headers: playerCors(req) });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: playerCors(req) });
}

// Same toggle cycle as /api/user/card-action (neutral → favorite →
// completed → neutral), but authenticated with the short-lived signed
// player bridge token instead of the site session cookie.
export async function POST(req: NextRequest) {
  const payload = await verifyPlayerToken(bearerFrom(req));
  if (!payload) return withCors({ error: 'Unauthorized' }, req, 401);

  const body = await req.json().catch(() => null);
  if (!body?.content_type || !body?.tmdb_id) {
    return withCors({ error: 'Bad request' }, req, 400);
  }
  const { content_type, tmdb_id, title, poster_path } = body;
  const uid = payload.uid;

  const fav = await executeFirst<{ id: number }>(
    `SELECT id FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`,
    [uid, content_type, tmdb_id],
  );
  if (fav) {
    await executeAll(
      `DELETE FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`,
      [uid, content_type, tmdb_id],
    );
    await executeAll(
      `INSERT OR IGNORE INTO completed_watch (user_id, content_type, tmdb_id, title, poster_path)
       VALUES (?,?,?,?,?)`,
      [uid, content_type, tmdb_id, title || null, poster_path || null],
    );
    return withCors({ ok: true, newState: 'completed' }, req);
  }

  const comp = await executeFirst<{ id: number }>(
    `SELECT id FROM completed_watch WHERE user_id=? AND content_type=? AND tmdb_id=?`,
    [uid, content_type, tmdb_id],
  );
  if (comp) {
    await executeAll(
      `DELETE FROM completed_watch WHERE user_id=? AND content_type=? AND tmdb_id=?`,
      [uid, content_type, tmdb_id],
    );
    return withCors({ ok: true, newState: 'neutral' }, req);
  }

  await executeAll(
    `INSERT OR IGNORE INTO favorites (user_id, content_type, content_id, tmdb_id, title, poster_path)
     VALUES (?,?,?,?,?,?)`,
    [uid, content_type, 0, tmdb_id, title || null, poster_path || null],
  );
  return withCors({ ok: true, newState: 'favorite' }, req);
}
