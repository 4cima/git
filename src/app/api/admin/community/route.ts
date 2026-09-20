/**
 * /api/admin/community — إشراف مجتمعي: اقتراحات الزوار + مراجعات المستخدمين.
 * GET: آخر 100 لكل قسم. POST: تحديث حالة اقتراح (seen|archived|new).
 * DELETE: حذف اقتراح أو مراجعة (?type=suggestion|review&id=N).
 * كل الـmethods خلف requireAdmin — no-store.
 */
import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

const SUGGESTION_STATUSES = ['new', 'seen', 'archived']

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const [suggestions, reviews] = await Promise.all([
      executeAll(
        `SELECT id, subject, message, user_agent, status, created_at
         FROM site_suggestions ORDER BY id DESC LIMIT 100`,
      ),
      executeAll(
        `SELECT id, username, content_type, content_id, tmdb_id, title, rating, review_text, created_at
         FROM user_reviews ORDER BY id DESC LIMIT 100`,
      ),
    ])
    return NextResponse.json({ ok: true, suggestions, reviews }, { headers: NO_STORE })
  } catch (error) {
    // جدول غير منشأ بعد → قوائم فاضية صريحة بدل 500
    if ((error as Error).message.includes('no such table')) {
      return NextResponse.json({ ok: true, suggestions: [], reviews: [], migrated: false }, { headers: NO_STORE })
    }
    return NextResponse.json({ ok: false, error: 'فشل جلب بيانات المجتمع' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { type, id, status } = (await request.json()) as { type?: unknown; id?: unknown; status?: unknown }
    if (type !== 'suggestion')
      return NextResponse.json({ ok: false, error: 'type يجب أن يكون suggestion' }, { status: 400, headers: NO_STORE })
    if (!id || typeof id !== 'number')
      return NextResponse.json({ ok: false, error: 'id (رقم) مطلوب' }, { status: 400, headers: NO_STORE })
    if (!status || typeof status !== 'string' || !SUGGESTION_STATUSES.includes(status))
      return NextResponse.json({ ok: false, error: `status يجب أن يكون: ${SUGGESTION_STATUSES.join(', ')}` }, { status: 400, headers: NO_STORE })

    const existing = await executeFirst('SELECT id FROM site_suggestions WHERE id = ?', [id])
    if (!existing) return NextResponse.json({ ok: false, error: 'الاقتراح غير موجود' }, { status: 404, headers: NO_STORE })

    await executeAll('UPDATE site_suggestions SET status = ? WHERE id = ?', [status, id])
    return NextResponse.json({ ok: true, message: `حالة الاقتراح → ${status}` }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل تحديث الاقتراح' }, { status: 500, headers: NO_STORE })
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = parseInt(searchParams.get('id') || '')
    if (!Number.isInteger(id) || id <= 0)
      return NextResponse.json({ ok: false, error: 'id غير صالح (?id=N)' }, { status: 400, headers: NO_STORE })

    if (type === 'suggestion') {
      await executeAll('DELETE FROM site_suggestions WHERE id = ?', [id])
      return NextResponse.json({ ok: true, message: 'حُذف الاقتراح' }, { headers: NO_STORE })
    }
    if (type === 'review') {
      await executeAll('DELETE FROM user_reviews WHERE id = ?', [id])
      return NextResponse.json({ ok: true, message: 'حُذفت المراجعة' }, { headers: NO_STORE })
    }
    return NextResponse.json({ ok: false, error: 'type يجب أن يكون suggestion أو review' }, { status: 400, headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل الحذف' }, { status: 500, headers: NO_STORE })
  }
}
