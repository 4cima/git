/**
 * /api/admin/users — إدارة المستخدمين.
 * GET: قائمة/بحث (LIMIT 100) + إجمالي حقيقي. PATCH: تغيير الدور
 * (user|supervisor|admin) بحماية requireAdmin + منع تخفيض آخر أدمن للنظام.
 */
import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

const ROLES = ['user', 'supervisor', 'admin']

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() || ''
    const where = q ? 'WHERE email LIKE ? OR name LIKE ?' : ''
    const args = q ? [`%${q}%`, `%${q}%`] : []
    const rows = await executeAll(
      `SELECT id, email, name, avatar_url, role, created_at, last_login_at
       FROM users ${where}
       ORDER BY created_at DESC LIMIT 100`,
      args,
    )
    const total = await executeFirst<{ c: number }>('SELECT COUNT(*) AS c FROM users')
    return NextResponse.json({ ok: true, users: rows, total: Number(total?.c ?? 0), shown: rows.length }, { headers: NO_STORE })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500, headers: NO_STORE })
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id, role } = (await request.json()) as { id?: unknown; role?: unknown }
    if (!id || typeof id !== 'string')
      return NextResponse.json({ ok: false, error: 'id (string) مطلوب' }, { status: 400, headers: NO_STORE })
    if (!role || typeof role !== 'string' || !ROLES.includes(role))
      return NextResponse.json({ ok: false, error: `role يجب أن يكون: ${ROLES.join(', ')}` }, { status: 400, headers: NO_STORE })

    const existing = await executeFirst<{ id: string; role: string }>('SELECT id, role FROM users WHERE id = ?', [id])
    if (!existing) return NextResponse.json({ ok: false, error: 'المستخدم غير موجود' }, { status: 404, headers: NO_STORE })

    // حماية النظام: لا يصبح النظام بلا أدمن (آخر حساب بأدوار إدارية لا يُخفَّض)
    if (role === 'user' && (existing.role === 'admin' || existing.role === 'supervisor')) {
      const adminsLeft = await executeFirst<{ c: number }>(
        `SELECT COUNT(*) AS c FROM users WHERE role IN ('admin','supervisor') AND id != ?`,
        [id],
      )
      if (Number(adminsLeft?.c ?? 0) === 0)
        return NextResponse.json({ ok: false, error: 'ممنوع — هذا آخر حساب إداري في النظام' }, { status: 400, headers: NO_STORE })
    }

    await executeAll('UPDATE users SET role = ? WHERE id = ?', [role, id])
    const updated = await executeFirst('SELECT id, email, name, role FROM users WHERE id = ?', [id])
    return NextResponse.json({ ok: true, user: updated, message: 'تم تحديث الدور' }, { headers: NO_STORE })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500, headers: NO_STORE })
  }
}
