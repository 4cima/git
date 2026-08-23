import { NextRequest, NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

// Get card states for multiple items
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
