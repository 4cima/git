import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tmdb_id: string }> }
) {
  const { tmdb_id } = await params
  const tmdbId = Number(tmdb_id)
  try {
    const { season_number, name, overview, air_date, episode_count } = await request.json()
    if (season_number === undefined)
      return NextResponse.json({ ok: false, error: 'season_number is required' }, { status: 400 })

    await executeAll(
      `INSERT INTO seasons (series_id, season_number, name, overview, air_date, episode_count) VALUES (?, ?, ?, ?, ?, ?)`,
      [tmdbId, season_number, name || `Season ${season_number}`, overview || '', air_date || null, episode_count || 0]
    )
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed'))
      return NextResponse.json({ ok: false, error: 'هذا الموسم موجود بالفعل' }, { status: 409 })
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tmdb_id: string }> }
) {
  await params
  try {
    const { season_id } = await request.json()
    if (!season_id) return NextResponse.json({ ok: false, error: 'season_id is required' }, { status: 400 })
    await executeAll('DELETE FROM seasons WHERE id = ?', [season_id])
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
