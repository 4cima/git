import { NextRequest, NextResponse } from 'next/server';
import { executeAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

const MAX_BYTES = 1024 * 1024; // 1MB — موحّد مع حد صفحة الإعدادات

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  // الواجهة القديمة ترسل 'avatar' والجديدة قد ترسل 'file' — نقبل الاثنين
  const raw = form.get('file') ?? form.get('avatar');
  const file = raw instanceof File ? raw : null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Image only' }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_BYTES) return NextResponse.json({ error: 'Max 1MB' }, { status: 413 });

  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const avatarUrl = `data:${file.type};base64,${btoa(bin)}`;

  await executeAll('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, user.id]);
  return NextResponse.json({ ok: true, avatar_url: avatarUrl });
}
