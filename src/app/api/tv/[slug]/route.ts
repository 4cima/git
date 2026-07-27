import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const result = await turso.execute({
      sql: `SELECT * FROM tv_series
            WHERE slug = ?
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            LIMIT 1`,
      args: [slug]
    })

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

    const series = result.rows[0]

    // seasons_json is stored as embedded JSON in tv_series (no separate tv_seasons table)
    let seasons: unknown[] = []
    try {
      seasons = series.seasons_json
        ? JSON.parse(series.seasons_json as string)
        : []
    } catch {
      seasons = []
    }

    return NextResponse.json(
      { ...series, seasons },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    )
  } catch (error) {
    console.error('❌ [API /tv/:slug] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
