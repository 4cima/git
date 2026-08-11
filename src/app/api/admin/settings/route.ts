import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

/**
 * GET /api/admin/settings
 * Get current settings
 */
export async function GET() {
  try {
    const result = await turso.execute('SELECT * FROM settings WHERE id = 1')

    if (result.rows.length === 0) {
      // Return defaults if table doesn't exist or is empty
      return NextResponse.json({
        ok: true,
        settings: {
          site_name: '4CIMA',
          site_description: 'موقع 4CIMA لمشاهدة أحدث الأفلام والمسلسلات المترجمة والمدبلجة بجودة عالية.',
          maintenance_mode: false,
          registration_open: true,
        },
      })
    }

    const row = result.rows[0]
    return NextResponse.json({
      ok: true,
      settings: {
        site_name: row.site_name,
        site_description: row.site_description,
        maintenance_mode: Boolean(row.maintenance_mode),
        registration_open: Boolean(row.registration_open),
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/settings
 * Update settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { site_name, site_description, maintenance_mode, registration_open } = body

    await turso.execute({
      sql: `UPDATE settings SET 
        site_name = ?,
        site_description = ?,
        maintenance_mode = ?,
        registration_open = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1`,
      args: [
        site_name || '4CIMA',
        site_description || '',
        maintenance_mode ? 1 : 0,
        registration_open ? 1 : 0,
      ],
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
