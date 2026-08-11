import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

/**
 * GET /api/admin/series/[tmdb_id]
 * Get series details with seasons
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tmdb_id: string }> }
) {
  const { tmdb_id } = await params
  const tmdbId = Number(tmdb_id)

  try {
    // Get series details
    const seriesResult = await turso.execute({
      sql: 'SELECT tmdb_id, name_ar, name_en, poster_path, overview_ar, first_air_year, vote_average FROM tv_series WHERE tmdb_id = ?',
      args: [tmdbId],
    })

    if (seriesResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Series not found' }, { status: 404 })
    }

    const series = seriesResult.rows[0]

    // Get seasons
    const seasonsResult = await turso.execute({
      sql: 'SELECT id, series_id, season_number, name, overview, air_date, episode_count, poster_path FROM seasons WHERE series_id = ? ORDER BY season_number ASC',
      args: [tmdbId],
    })

    return NextResponse.json({
      ok: true,
      series: {
        tmdb_id: series.tmdb_id,
        name_ar: series.name_ar,
        name_en: series.name_en,
        poster_path: series.poster_path,
        overview_ar: series.overview_ar,
        first_air_year: series.first_air_year,
        vote_average: series.vote_average,
      },
      seasons: seasonsResult.rows,
    })
  } catch (error: unknown) {
    console.error('Error fetching series details:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
