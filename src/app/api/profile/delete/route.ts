import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = user.id;
  const tables = [
    'sessions',
    'favorites',
    'watch_history',
    'user_reviews',
    'user_achievements',
    'user_notification_settings',
    'user_privacy_settings',
    'operations_log',
  ];

  for (const table of tables) {
    await executeAll(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
  }
  await executeAll(`DELETE FROM users WHERE id = ?`, [userId]);

  return NextResponse.json({ ok: true, deleted: true });
}
