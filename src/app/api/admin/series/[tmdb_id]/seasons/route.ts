import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

/**
 * POST /api/admin/series/[tmdb_id]/seasons
 * Add a new season
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tmdb_id: string }> }
) {
  const { tmdb_id } = await params
  const tmdbId = Number(tmdb_id)

  try {
    const body = await request.json()
    const { season_number, name, overview, air_date, episode_count } = body

    if (season_number === undefined) {
      return NextResponse.json({ ok: false, error: 'season_number is required' }, { status: 400 })
    }

    await turso.execute({
      sql: `INSERT INTO seasons (
        series_id, season_number, name, overview, air_date, episode_count
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        tmdbId,
        season_number,
        name || `Season ${season_number}`,
        overview || '',
        air_date || null,
        episode_count || 0,
      ],
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Error adding season:', error)
    
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { ok: false, error: 'هذا الموسم موجود بالفعل' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/series/[tmdb_id]/seasons
 * Delete a season
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tmdb_id: string }> }
) {
  await params // Required to consume params even if not used

  try {
    const body = await request.json()
    const { season_id } = body

    if (!season_id) {
      return NextResponse.json({ ok: false, error: 'season_id is required' }, { status: 400 })
    }

    await turso.execute({
      sql: 'DELETE FROM seasons WHERE id = ?',
      args: [season_id],
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Error deleting season:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
