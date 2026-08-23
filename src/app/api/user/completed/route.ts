import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const rows = await executeAll(
    `SELECT * FROM completed_watch WHERE user_id=? ORDER BY added_at DESC LIMIT 100`, 
    [user.id]
  );
  
  return NextResponse.json({ ok: true, items: rows });
}
