import { NextRequest, NextResponse } from 'next/server';
import { executeFirst } from '@/lib/db';
import { bearerFrom, playerCors, verifyPlayerToken } from '@/lib/player-bridge';

export const runtime = 'nodejs'

function withCors(body: unknown, req: Request, status = 200) {
  return NextResponse.json(body, { status, headers: playerCors(req) });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: playerCors(req) });
}

// Verify a player bridge token and return the user + current heart state
// for one item (same state keys as /api/user/card-state).
export async function GET(req: NextRequest) {
  const payload = await verifyPlayerToken(bearerFrom(req));
  if (!payload) return withCors({ error: 'Unauthorized' }, req, 401);

  const type = req.nextUrl.searchParams.get('type') || '';
  const id = parseInt(req.nextUrl.searchParams.get('id') || '', 10);
  let heartState: 'neutral' | 'favorite' | 'completed' = 'neutral';
  if ((type === 'movie' || type === 'tv') && Number.isFinite(id) && id > 0) {
    const fav = await executeFirst<{ id: number }>(
      `SELECT id FROM favorites WHERE user_id=? AND content_type=? AND tmdb_id=?`,
      [payload.uid, type, id],
    );
    if (fav) heartState = 'favorite';
    else {
      const comp = await executeFirst<{ id: number }>(
        `SELECT id FROM completed_watch WHERE user_id=? AND content_type=? AND tmdb_id=?`,
        [payload.uid, type, id],
      );
      if (comp) heartState = 'completed';
    }
  }

  return withCors({
    ok: true,
    user: { name: payload.name, avatar: payload.avatar, role: payload.role },
    heartState,
  }, req);
}
