/**
 * /api/admin/ads/providers — CRUD شبكات الإعلانات (presets + custom).
 * إيقاف شبكة (status→paused) بيقفها فورًا في /api/ads/serve (اللي يشترط p.status='active').
 * كل الmethods خلف requireAdmin — no-store دائمًا.
 */
import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

const PRESET_SLUGS = [
  'propellerads', 'adsterra', 'exoclick', 'popads',
  'popcash', 'hilltopads', 'trafficstars', 'custom',
]

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const providers = await executeAll<Record<string, unknown>>(
      `SELECT id, name, slug, status, notes, created_at, updated_at
       FROM ad_providers ORDER BY id ASC`,
    )
    return NextResponse.json({ ok: true, data: providers }, { headers: NO_STORE })
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes('no such table')) {
      return NextResponse.json({ ok: true, data: [], migrated: false }, { headers: NO_STORE })
    }
    return NextResponse.json({ ok: false, error: 'Failed to fetch providers' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = (await request.json()) as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
    const status = body.status === 'active' ? 'active' : 'paused'
    const notes = typeof body.notes === 'string' && body.notes ? body.notes : null

    if (!name || !slug) {
      return NextResponse.json({ ok: false, error: 'name و slug مطلوبان' }, { status: 400, headers: NO_STORE })
    }
    if (PRESET_SLUGS.includes(slug)) {
      return NextResponse.json({ ok: false, error: `«${slug}» slug محجوز للـpresets — استخدم Custom` }, { status: 400, headers: NO_STORE })
    }
    try {
      await executeAll(`INSERT INTO ad_providers (name, slug, status, notes) VALUES (?, ?, ?, ?)`, [name, slug, status, notes])
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('UNIQUE')) {
        return NextResponse.json({ ok: false, error: 'يوجد شبكة بنفس الـslug' }, { status: 400, headers: NO_STORE })
      }
      if (msg.includes('no such table')) {
        return NextResponse.json({ ok: false, error: 'جداول الوساطة غير منشأة بعد' }, { status: 409, headers: NO_STORE })
      }
      throw err
    }
    return NextResponse.json({ ok: true, message: 'أُنشئت الشبكة' }, { status: 201, headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل إنشاء الشبكة' }, { status: 500, headers: NO_STORE })
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = (await request.json()) as Record<string, unknown>
    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: 'id غير صالح' }, { status: 400, headers: NO_STORE })
    }

    const updates: string[] = []
    const values: (string | number | null)[] = []
    if (body.status !== undefined) {
      const status = String(body.status)
      if (status !== 'active' && status !== 'paused') {
        return NextResponse.json({ ok: false, error: 'status يجب أن يكون active أو paused' }, { status: 400, headers: NO_STORE })
      }
      updates.push('status = ?')
      values.push(status)
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?')
      values.push(body.notes ? String(body.notes) : null)
    }
    if (updates.length === 0) {
      return NextResponse.json({ ok: false, error: 'لا حقول للتحديث' }, { status: 400, headers: NO_STORE })
    }

    try {
      updates.push("updated_at = datetime('now')")
      await executeAll(`UPDATE ad_providers SET ${updates.join(', ')} WHERE id = ?`, [...values, id])
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table')) {
        return NextResponse.json({ ok: false, error: 'جداول الوساطة غير منشأة بعد' }, { status: 409, headers: NO_STORE })
      }
      // updated_at قد لا يوجد — أعد المحاولة بدونه
      const base = updates.filter((u) => !u.startsWith('updated_at'))
      await executeAll(`UPDATE ad_providers SET ${base.join(', ')} WHERE id = ?`, [...values.slice(0, base.length), id])
    }
    return NextResponse.json({ ok: true, message: 'تم التحديث — الأثر فوري على serve' }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل تحديث الشبكة' }, { status: 500, headers: NO_STORE })
  }
}
