import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'

const PATCHABLE_MOVIE_COLS = new Set([
  'title_ar', 'title_en', 'overview_ar', 'release_year',
  'vote_average', 'runtime', 'trailer_key', 'poster_path',
  'backdrop_path', 'filter_status',
])

export async function PATCH(request: NextRequest) {
  let body: { tmdb_id?: unknown; fields?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }

  const { tmdb_id, fields } = body
  if (!tmdb_id || typeof tmdb_id !== 'number')
    return NextResponse.json({ ok: false, error: 'tmdb_id (number) required' }, { status: 400 })
  if (!fields || typeof fields !== 'object' || Array.isArray(fields))
    return NextResponse.json({ ok: false, error: 'fields (object) required' }, { status: 400 })

  const safe = Object.entries(fields as Record<string, unknown>)
    .filter(([k]) => PATCHABLE_MOVIE_COLS.has(k))
    .filter(([, v]) => v !== undefined)

  if (safe.length === 0)
    return NextResponse.json({ ok: false, error: 'No patchable fields provided' }, { status: 400 })

  const check = await executeFirst('SELECT tmdb_id FROM movies WHERE tmdb_id = ?', [tmdb_id])
  if (!check) return NextResponse.json({ ok: false, error: `tmdb_id=${tmdb_id} not found` }, { status: 404 })

  const setClauses = safe.map(([k]) => `${k} = ?`).join(', ')
  const args = [...safe.map(([, v]) => v as string | number | boolean | null), new Date().toISOString().replace('T', ' ').slice(0, 19), tmdb_id]
  await executeAll(`UPDATE movies SET ${setClauses}, updated_at = ? WHERE tmdb_id = ?`, args)

  const updated = await executeFirst('SELECT tmdb_id, title_ar, title_en, filter_status, updated_at FROM movies WHERE tmdb_id = ?', [tmdb_id])
  return NextResponse.json({ ok: true, tmdb_id, updated })
}

export async function DELETE(request: NextRequest) {
  let body: { tmdb_id?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }

  const { tmdb_id } = body
  if (!tmdb_id || typeof tmdb_id !== 'number')
    return NextResponse.json({ ok: false, error: 'tmdb_id (number) required' }, { status: 400 })

  const check = await executeFirst('SELECT tmdb_id, title_en FROM movies WHERE tmdb_id = ?', [tmdb_id])
  if (!check) return NextResponse.json({ ok: false, error: `tmdb_id=${tmdb_id} not found` }, { status: 404 })

  const title = check.title_en
  await executeAll('DELETE FROM movies WHERE tmdb_id = ?', [tmdb_id])

  const verify = await executeFirst('SELECT tmdb_id FROM movies WHERE tmdb_id = ?', [tmdb_id])
  if (verify) return NextResponse.json({ ok: false, error: 'Delete failed — row still exists' }, { status: 500 })

  return NextResponse.json({ ok: true, tmdb_id, deleted_title: title })
}
