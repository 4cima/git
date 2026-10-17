import { NextRequest, NextResponse } from 'next/server'
import { executeFirst } from '@/lib/db'
import { extractTmdbIdFromSlug } from '@/lib/slugGenerator'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // المرحلة 2 بند 3: احتياط tmdb_id لأي صيغة سلاج — رقم صريح، w-{id}-{year}،
    // أو {كلمات}-{id} — حتى لا يفقد مشغّل 4cima.stream تشغيله بعد تغيير السلاج.
    const tmdbId = extractTmdbIdFromSlug(slug)
    const series = await executeFirst(
      `SELECT * FROM tv_series
            WHERE (slug = ? OR tmdb_id = ?)
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
              AND first_air_year IS NOT NULL AND first_air_year >= 2000
            LIMIT 1`,
      [slug, tmdbId ?? -1]
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
