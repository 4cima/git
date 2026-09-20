/**
 * /api/admin/ads/assignments — CRUD ربط المساحات بالمناطق (waterfall).
 * الترتيب: priority ASC ثم عشوائي موزون داخل نفس الأولوية.
 * مصدر الـslots الوحيد: src/lib/adSlots.ts (9 مساحات — نفس قائمة /api/ads/serve).
 */
import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'
import { VALID_SLOTS, AD_DEVICES } from '@/lib/adSlots'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const assignments = await executeAll<Record<string, unknown>>(
      `SELECT a.id, a.slot_key, a.zone_id, a.priority, a.weight, a.device,
              a.start_at, a.end_at, a.frequency_cap, a.frequency_hours, a.active,
              z.name AS zone_name, z.type AS zone_type,
              p.name AS provider_name, p.slug AS provider_slug,
              p.status AS provider_status
       FROM ad_slot_assignments a
       JOIN ad_zones z ON z.id = a.zone_id
       JOIN ad_providers p ON p.id = z.provider_id
       ORDER BY a.slot_key ASC, a.priority ASC, a.id ASC`,
    )
    let slots: Record<string, unknown>[] = []
    try {
      slots = await executeAll<Record<string, unknown>>('SELECT id, slot_key, name, types, page_scope FROM ad_slots ORDER BY id ASC')
    } catch {
      // ad_slots قد تكون غير منشأة — نكمل بقائمة الـslots من الكود
    }
    return NextResponse.json({ ok: true, data: assignments, slots }, { headers: NO_STORE })
  } catch (error) {
    if ((error as Error).message.includes('no such table')) {
      return NextResponse.json({ ok: true, data: [], slots: [], migrated: false }, { headers: NO_STORE })
    }
    return NextResponse.json({ ok: false, error: 'فشل جلب السكك' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = (await request.json()) as Record<string, unknown>
    const slotKey = typeof body.slot_key === 'string' ? body.slot_key : ''
    const zoneId = Number(body.zone_id)
    const priority = Number(body.priority)
    const weight = Number(body.weight)
    const device = typeof body.device === 'string' && body.device ? body.device : 'all'
    const active = body.active === 0 ? 0 : 1 // السكك تُنشأ تعمل — راجعها من القائمة
    const startAt = typeof body.start_at === 'string' && body.start_at ? body.start_at : null
    const endAt = typeof body.end_at === 'string' && body.end_at ? body.end_at : null
    const freqCap = Number(body.frequency_cap)
    const freqHours = Number(body.frequency_hours)

    if (!VALID_SLOTS.includes(slotKey)) {
      return NextResponse.json({ ok: false, error: `slot_key يجب أن يكون من: ${VALID_SLOTS.join(', ')}` }, { status: 400, headers: NO_STORE })
    }
    if (!Number.isInteger(zoneId) || zoneId <= 0)
      return NextResponse.json({ ok: false, error: 'zone_id غير صالح' }, { status: 400, headers: NO_STORE })
    if (!(AD_DEVICES as readonly string[]).includes(device))
      return NextResponse.json({ ok: false, error: 'device غير صالح' }, { status: 400, headers: NO_STORE })

    try {
      await executeAll(
        `INSERT INTO ad_slot_assignments
           (slot_key, zone_id, priority, weight, device, start_at, end_at, frequency_cap, frequency_hours, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slotKey, zoneId,
          Number.isFinite(priority) && priority > 0 ? priority : 1,
          Number.isFinite(weight) && weight > 0 ? weight : 1,
          device, startAt, endAt,
          Number.isFinite(freqCap) && freqCap >= 0 ? freqCap : 1,
          Number.isFinite(freqHours) && freqHours >= 0 ? freqHours : 24,
          active,
        ],
      )
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table'))
        return NextResponse.json({ ok: false, error: 'جداول الوساطة غير منشأة بعد' }, { status: 409, headers: NO_STORE })
      if (msg.includes('FOREIGN KEY'))
        return NextResponse.json({ ok: false, error: 'zone_id أو slot_key غير موجود' }, { status: 400, headers: NO_STORE })
      throw err
    }
    return NextResponse.json({ ok: true, message: 'أُضيفت للسكة (waterfall)' }, { status: 201, headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل إنشاء الربط' }, { status: 500, headers: NO_STORE })
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
    const values: (string | number | null)[] = []

    if (body.slot_key !== undefined) {
      const sk = String(body.slot_key)
      if (!VALID_SLOTS.includes(sk)) return NextResponse.json({ ok: false, error: 'slot_key غير صالح' }, { status: 400, headers: NO_STORE })
      updates.push('slot_key = ?'); values.push(sk)
    }
    if (body.zone_id !== undefined) {
      const zid = Number(body.zone_id)
      if (!Number.isInteger(zid) || zid <= 0) return NextResponse.json({ ok: false, error: 'zone_id غير صالح' }, { status: 400, headers: NO_STORE })
      updates.push('zone_id = ?'); values.push(zid)
    }
    if (body.priority !== undefined) { updates.push('priority = ?'); values.push(Number(body.priority) || 1) }
    if (body.weight !== undefined) { updates.push('weight = ?'); values.push(Number(body.weight) || 1) }
    if (body.device !== undefined) {
      const device = String(body.device)
      if (!(AD_DEVICES as readonly string[]).includes(device)) return NextResponse.json({ ok: false, error: 'device غير صالح' }, { status: 400, headers: NO_STORE })
      updates.push('device = ?'); values.push(device)
    }
    if (body.start_at !== undefined) { updates.push('start_at = ?'); values.push(body.start_at ? String(body.start_at) : null) }
    if (body.end_at !== undefined) { updates.push('end_at = ?'); values.push(body.end_at ? String(body.end_at) : null) }
    if (body.frequency_cap !== undefined) { const c = Number(body.frequency_cap); updates.push('frequency_cap = ?'); values.push(Number.isFinite(c) && c >= 0 ? c : 1) }
    if (body.frequency_hours !== undefined) { const h = Number(body.frequency_hours); updates.push('frequency_hours = ?'); values.push(Number.isFinite(h) && h >= 0 ? h : 24) }
    if (body.active !== undefined) { updates.push('active = ?'); values.push(body.active ? 1 : 0) }

    if (updates.length === 0)
      return NextResponse.json({ ok: false, error: 'لا حقول للتحديث' }, { status: 400, headers: NO_STORE })

    try {
      await executeAll(`UPDATE ad_slot_assignments SET ${updates.join(', ')} WHERE id = ?`, [...values, id])
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table'))
        return NextResponse.json({ ok: false, error: 'جداول الوساطة غير منشأة بعد' }, { status: 409, headers: NO_STORE })
      if (msg.includes('FOREIGN KEY'))
        return NextResponse.json({ ok: false, error: 'zone_id أو slot_key غير موجود' }, { status: 400, headers: NO_STORE })
      throw err
    }
    return NextResponse.json({ ok: true, message: 'تم تحديث الربط' }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل تحديث الربط' }, { status: 500, headers: NO_STORE })
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '')
    if (!Number.isInteger(id) || id <= 0)
      return NextResponse.json({ ok: false, error: 'id غير صالح (?id=N)' }, { status: 400, headers: NO_STORE })
    try {
      await executeAll('DELETE FROM ad_slot_assignments WHERE id = ?', [id])
    } catch (err) {
      if ((err as Error).message.includes('no such table'))
        return NextResponse.json({ ok: false, error: 'جداول الوساطة غير منشأة بعد' }, { status: 409, headers: NO_STORE })
      throw err
    }
    return NextResponse.json({ ok: true, message: 'أُزيل الربط' }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل حذف الربط' }, { status: 500, headers: NO_STORE })
  }
}
