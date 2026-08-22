import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b?.content_type || !b?.tmdb_id || !b?.rating) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  await executeAll(`DELETE FROM user_reviews WHERE user_id=? AND content_type=? AND tmdb_id=?`, [user.id, b.content_type, b.tmdb_id]);
  await executeAll(
    `INSERT INTO user_reviews (user_id, username, content_type, content_id, tmdb_id, title, rating, review_text) VALUES (?,?,?,?,?,?,?,?)`,
    [user.id, user.name||user.email, b.content_type, b.content_id||0, b.tmdb_id, b.title||null, b.rating, b.review_text||null]
  );
  return NextResponse.json({ ok: true });
}
