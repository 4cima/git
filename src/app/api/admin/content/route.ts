import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type } = body

    if (type === 'movie') {
      const { tmdb_id, title_en, original_title, overview_en, poster_path, backdrop_path, release_date, vote_average, genre_ids = [] } = body
      const release_year = release_date ? parseInt(release_date.split('-')[0]) : null
      await executeAll(
        `INSERT INTO movies (tmdb_id, title_en, original_title, overview_en, poster_path, backdrop_path, release_year, vote_average, genre_ids, filter_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
        [tmdb_id, title_en, original_title || title_en, overview_en || '', poster_path || '', backdrop_path || '', release_year, vote_average || 0, JSON.stringify(genre_ids)]
      )
      return NextResponse.json({ ok: true, tmdb_id })
    } else if (type === 'series') {
      const { tmdb_id, name_en, original_name, overview_en, poster_path, backdrop_path, first_air_date, vote_average, genre_ids = [] } = body
      const first_air_year = first_air_date ? parseInt(first_air_date.split('-')[0]) : null
      await executeAll(
        `INSERT INTO tv_series (tmdb_id, name_en, original_name, overview_en, poster_path, backdrop_path, first_air_year, vote_average, genre_ids, filter_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
        [tmdb_id, name_en, original_name || name_en, overview_en || '', poster_path || '', backdrop_path || '', first_air_year, vote_average || 0, JSON.stringify(genre_ids)]
      )
      return NextResponse.json({ ok: true, tmdb_id })
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid type' }, { status: 400 })
    }
  } catch (error: unknown) {
    console.error('Error adding content:', error)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ ok: false, error: 'هذا المحتوى موجود بالفعل في قاعدة البيانات' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
