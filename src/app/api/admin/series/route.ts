import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

const PATCHABLE_SERIES_COLS = new Set([
  'name_ar', 'name_en', 'overview_ar', 'first_air_year',
  'vote_average', 'number_of_seasons', 'number_of_episodes',
  'status', 'trailer_key', 'poster_path', 'backdrop_path',
  'filter_status',
])

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/series
// Body: { tmdb_id: number, fields: Record<string, unknown> }
// ─────────────────────────────────────────────────────────────
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
    .filter(([k]) => PATCHABLE_SERIES_COLS.has(k))

  if (safe.length === 0)
    return NextResponse.json({ ok: false, error: 'No patchable fields provided' }, { status: 400 })

  const setClauses = safe.map(([k]) => `${k} = ?`).join(', ')
  const args = [...safe.map(([, v]) => v), new Date().toISOString().replace('T', ' ').slice(0, 19), tmdb_id]

  const check = await turso.execute({ sql: 'SELECT tmdb_id FROM tv_series WHERE tmdb_id = ?', args: [tmdb_id] })
  if (!check.rows?.length)
    return NextResponse.json({ ok: false, error: `tmdb_id=${tmdb_id} not found` }, { status: 404 })

  await turso.execute({
    sql: `UPDATE tv_series SET ${setClauses}, updated_at = ? WHERE tmdb_id = ?`,
    args,
  })

  const updated = await turso.execute({ sql: 'SELECT tmdb_id, name_ar, name_en, filter_status, updated_at FROM tv_series WHERE tmdb_id = ?', args: [tmdb_id] })

  return NextResponse.json({ ok: true, tmdb_id, updated: updated.rows[0] })
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/series
// Body: { tmdb_id: number }
// ─────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  let body: { tmdb_id?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }

  const { tmdb_id } = body

  if (!tmdb_id || typeof tmdb_id !== 'number')
    return NextResponse.json({ ok: false, error: 'tmdb_id (number) required' }, { status: 400 })

  const check = await turso.execute({ sql: 'SELECT tmdb_id, name_en FROM tv_series WHERE tmdb_id = ?', args: [tmdb_id] })
  if (!check.rows?.length)
    return NextResponse.json({ ok: false, error: `tmdb_id=${tmdb_id} not found` }, { status: 404 })

  const name = check.rows[0].name_en

  await turso.execute({ sql: 'DELETE FROM tv_series WHERE tmdb_id = ?', args: [tmdb_id] })

  const verify = await turso.execute({ sql: 'SELECT tmdb_id FROM tv_series WHERE tmdb_id = ?', args: [tmdb_id] })
  if (verify.rows?.length)
    return NextResponse.json({ ok: false, error: 'Delete failed — row still exists' }, { status: 500 })

  return NextResponse.json({ ok: true, tmdb_id, deleted_name: name })
}