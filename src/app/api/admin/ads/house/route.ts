/**
 * /api/admin/ads/house — CRUD الإعلانات الداخلية (House Ads، جدول `ads`).
 * كل الـmethods خلف requireAdmin (مزدوجة فوق middleware) — no-store دائمًا.
 */
import { NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'
import { isSafeAdUrl } from '@/lib/adsAllowlist'
import { HOUSE_TYPES } from '@/lib/adSlots'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

type AdRow = {
  id: number
  title: string
  type: string
  content: string
  position?: string | null
  active?: number | null
  impressions?: number | null
  clicks?: number | null
  click_url?: string | null
  weight?: number | null
  device?: string | null
  start_at?: string | null
  end_at?: string | null
  frequency_cap?: number | null
  frequency_hours?: number | null
  impression_cap?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const ads = await executeAll<AdRow>('SELECT * FROM ads ORDER BY created_at DESC')
    return NextResponse.json({ ok: true, data: ads }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل جلب الإعلانات الداخلية' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = (await request.json()) as Record<string, unknown>
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const type = typeof body.type === 'string' ? body.type : ''
    const content = typeof body.content === 'string' ? body.content : ''
    const position = typeof body.position === 'string' && body.position.trim() ? body.position.trim() : null
    const active = body.active === 0 ? 0 : 1
    const clickUrl = typeof body.click_url === 'string' && body.click_url.trim() ? body.click_url.trim() : null

    if (!title || !type || !content)
      return NextResponse.json({ ok: false, error: 'الحقول المطلوبة: title, type, content' }, { status: 400, headers: NO_STORE })
    if (!(HOUSE_TYPES as readonly string[]).includes(type))
      return NextResponse.json({ ok: false, error: `type يجب أن يكون: ${HOUSE_TYPES.join(', ')}` }, { status: 400, headers: NO_STORE })
    if (clickUrl && !isSafeAdUrl(clickUrl))
      return NextResponse.json({ ok: false, error: 'click_url يجب أن يكون رابط http/https' }, { status: 400, headers: NO_STORE })

    // أعمدة click_url/updated_at قد لا توجد قبل الـmigration — جرّب ثم رجّع للحد الأدنى
    try {
      await executeAll(
        `INSERT INTO ads (title, type, content, position, active, click_url, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [title, type, content, position, active, clickUrl],
      )
    } catch {
      await executeAll(
        `INSERT INTO ads (title, type, content, position, active) VALUES (?, ?, ?, ?, ?)`,
        [title, type, content, position, active],
      )
    }
    return NextResponse.json({ ok: true, message: 'أُنشئ الإعلان الداخلي' }, { status: 201, headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل إنشاء الإعلان' }, { status: 500, headers: NO_STORE })
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = (await request.json()) as Record<string, unknown>
    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0)
      return NextResponse.json({ ok: false, error: 'id غير صالح' }, { status: 400, headers: NO_STORE })

    const updates: string[] = []
    const values: (string | number | boolean | null)[] = []

    if (body.title !== undefined) { updates.push('title = ?'); values.push(String(body.title)) }
    if (body.type !== undefined) {
      const type = String(body.type)
      if (!(HOUSE_TYPES as readonly string[]).includes(type))
        return NextResponse.json({ ok: false, error: 'type غير صالح' }, { status: 400, headers: NO_STORE })
      updates.push('type = ?'); values.push(type)
    }
    if (body.content !== undefined) { updates.push('content = ?'); values.push(String(body.content)) }
    if (body.position !== undefined) { updates.push('position = ?'); values.push(body.position ? String(body.position) : null) }
    if (body.active !== undefined) { updates.push('active = ?'); values.push(body.active ? 1 : 0) }
    if (body.click_url !== undefined) {
      const clickUrl = body.click_url ? String(body.click_url).trim() : null
      if (clickUrl && !isSafeAdUrl(clickUrl))
        return NextResponse.json({ ok: false, error: 'click_url يجب أن يكون رابط http/https' }, { status: 400, headers: NO_STORE })
      updates.push('click_url = ?'); values.push(clickUrl)
    }
    if (body.weight !== undefined) { updates.push('weight = ?'); values.push(Number(body.weight) || 1) }
    if (body.device !== undefined) {
      const device = String(body.device || 'all')
      if (!['all', 'mobile', 'desktop'].includes(device))
        return NextResponse.json({ ok: false, error: 'device غير صالح' }, { status: 400, headers: NO_STORE })
      updates.push('device = ?'); values.push(device)
    }
    if (body.start_at !== undefined) { updates.push('start_at = ?'); values.push(body.start_at ? String(body.start_at) : null) }
    if (body.end_at !== undefined) { updates.push('end_at = ?'); values.push(body.end_at ? String(body.end_at) : null) }
    if (body.frequency_cap !== undefined) { updates.push('frequency_cap = ?'); values.push(Number(body.frequency_cap) || 1) }
    if (body.frequency_hours !== undefined) { updates.push('frequency_hours = ?'); values.push(Number(body.frequency_hours) || 24) }

    if (updates.length === 0)
      return NextResponse.json({ ok: false, error: 'لا حقول للتحديث' }, { status: 400, headers: NO_STORE })

    // عمود updated_at قد لا يوجد — جرّب ثم رجّع بدونه
    const baseUpdates = [...updates]
    const baseValues = [...values]
    try {
      await executeAll(
        `UPDATE ads SET ${[...baseUpdates, "updated_at = datetime('now')"].join(', ')} WHERE id = ?`,
        [...baseValues, id],
      )
    } catch {
      await executeAll(`UPDATE ads SET ${baseUpdates.join(', ')} WHERE id = ?`, [...baseValues, id])
    }
    return NextResponse.json({ ok: true, message: 'تم تحديث الإعلان' }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل تحديث الإعلان' }, { status: 500, headers: NO_STORE })
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '')
    if (!Number.isInteger(id) || id <= 0)
      return NextResponse.json({ ok: false, error: 'id غير صالح (?id=)' }, { status: 400, headers: NO_STORE })

    const ad = await executeFirst<AdRow>('SELECT id FROM ads WHERE id = ?', [id])
    if (!ad) return NextResponse.json({ ok: false, error: 'الإعلان غير موجود' }, { status: 404, headers: NO_STORE })

    await executeAll('DELETE FROM ads WHERE id = ?', [id])
    return NextResponse.json({ ok: true, message: 'حُذف الإعلان' }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل حذف الإعلان' }, { status: 500, headers: NO_STORE })
  }
}
