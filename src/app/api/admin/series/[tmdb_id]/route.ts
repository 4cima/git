import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tmdb_id: string }> }
) {
  const { tmdb_id } = await params
  const tmdbId = Number(tmdb_id)
  try {
    const series = await executeFirst(
      'SELECT tmdb_id, name_ar, name_en, poster_path, overview_ar, first_air_year, vote_average FROM tv_series WHERE tmdb_id = ?',
      [tmdbId]
    )
    if (!series) return NextResponse.json({ ok: false, error: 'Series not found' }, { status: 404 })

    // seasons are stored in seasons_json on tv_series — no separate seasons table in D1
    const seasons = await executeAll(
      'SELECT id, series_id, season_number, name, overview, air_date, episode_count, poster_path FROM seasons WHERE series_id = ? ORDER BY season_number ASC',
      [tmdbId]
    ).catch(() => [])

    return NextResponse.json({ ok: true, series, seasons })
  } catch (error: unknown) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
