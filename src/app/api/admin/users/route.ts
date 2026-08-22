import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const admin = await getCurrentUser(request);
  if (!admin || (admin.role !== 'admin' && admin.role !== 'supervisor')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';

  let rows;
  if (q) {
    rows = await executeAll(
      `SELECT id, email, name, avatar_url, role, created_at, last_login_at
       FROM users
       WHERE email LIKE ? OR name LIKE ?
       ORDER BY created_at DESC LIMIT 100`,
      ['%' + q + '%', '%' + q + '%']
    );
  } else {
    rows = await executeAll(
      `SELECT id, email, name, avatar_url, role, created_at, last_login_at
       FROM users ORDER BY created_at DESC LIMIT 100`
    );
  }

  return NextResponse.json({ ok: true, users: rows, total: rows.length });
}
