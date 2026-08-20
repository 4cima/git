import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'

export async function GET() {
  try {
    const row = await executeFirst('SELECT * FROM settings WHERE id = 1')
    if (!row) {
      return NextResponse.json({
        ok: true,
        settings: { site_name: '4CIMA', site_description: 'موقع 4CIMA لمشاهدة أحدث الأفلام والمسلسلات المترجمة والمدبلجة بجودة عالية.', maintenance_mode: false, registration_open: true }
      })
    }
    return NextResponse.json({
      ok: true,
      settings: { site_name: row.site_name, site_description: row.site_description, maintenance_mode: Boolean(row.maintenance_mode), registration_open: Boolean(row.registration_open) }
    })
  } catch (error: unknown) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { site_name, site_description, maintenance_mode, registration_open } = await request.json()
    await executeAll(
      `UPDATE settings SET site_name=?, site_description=?, maintenance_mode=?, registration_open=?, updated_at=CURRENT_TIMESTAMP WHERE id=1`,
      [site_name || '4CIMA', site_description || '', maintenance_mode ? 1 : 0, registration_open ? 1 : 0]
    )
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
