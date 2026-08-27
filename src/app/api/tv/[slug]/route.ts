import { NextRequest, NextResponse } from 'next/server'
import { executeFirst } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Numeric lookups resolve by tmdb_id (used by the player worker's
    // /watch?id=… fallback); text slugs match the slug column only.
    const isNumeric = /^\d+$/.test(slug)
    const series = await executeFirst(
      `SELECT * FROM tv_series
            WHERE (slug = ?${isNumeric ? ' OR tmdb_id = ?' : ''})
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            LIMIT 1`,
      isNumeric ? [slug, Number(slug)] : [slug]
    )

    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

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
