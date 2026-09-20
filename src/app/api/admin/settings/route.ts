/**
 * /api/admin/settings — قراءة/كتابة إعدادات الموقع (جدول settings).
 * كل الـmethods خلف requireAdmin. بعد الكتابة: إبطال الكاش فورًا
 * (الصيانة/التسجيل يسري خلال ≤60 ثانية على كل الـisolates).
 */
import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'
import { invalidateSettingsCache } from '@/lib/settings'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const row = await executeFirst<Record<string, unknown>>('SELECT * FROM settings WHERE id = 1')
    return NextResponse.json(
      {
        ok: true,
        settings: row
          ? {
              site_name: String(row.site_name || '4CIMA'),
              site_description: String(row.site_description ?? ''),
              maintenance_mode: Boolean(row.maintenance_mode),
              registration_open: row.registration_open == null ? true : Boolean(row.registration_open),
            }
          : { site_name: '4CIMA', site_description: '', maintenance_mode: false, registration_open: true },
      },
      { headers: NO_STORE },
    )
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { site_name, site_description, maintenance_mode, registration_open } = await request.json()
    const existing = await executeFirst('SELECT id FROM settings WHERE id = 1')
    if (existing) {
      await executeAll(
        `UPDATE settings SET site_name=?, site_description=?, maintenance_mode=?, registration_open=?, updated_at=CURRENT_TIMESTAMP WHERE id=1`,
        [site_name || '4CIMA', site_description || '', maintenance_mode ? 1 : 0, registration_open === false ? 0 : 1],
      )
    } else {
      await executeAll(
        `INSERT INTO settings (id, site_name, site_description, maintenance_mode, registration_open) VALUES (1, ?, ?, ?, ?)`,
        [site_name || '4CIMA', site_description || '', maintenance_mode ? 1 : 0, registration_open === false ? 0 : 1],
      )
    }
    invalidateSettingsCache()
    return NextResponse.json({ ok: true, message: 'تم الحفظ — يسري خلال دقيقة' })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500, headers: NO_STORE })
  }
}
