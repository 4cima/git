import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import localDb from '@/lib/local-db-server'

export async function GET() {
  try {
    const [movies, series] = await Promise.all([
      executeAll(
        `SELECT tmdb_id, slug, title_ar, title_en, release_year AS year, vote_average, overview_ar, filter_status, poster_path
         FROM movies WHERE filter_status = 'needs_review' ORDER BY vote_average DESC`,
        []
      ),
      executeAll(
        `SELECT tmdb_id, slug, name_ar AS title_ar, name_en AS title_en, first_air_year AS year, vote_average, overview_ar, filter_status, poster_path
         FROM tv_series WHERE filter_status = 'needs_review' ORDER BY vote_average DESC`,
        []
      )
    ])
    return NextResponse.json({
      ok: true, total: movies.length + series.length,
      movies: movies.map(r => ({ ...r, type: 'movie' as const })),
      series: series.map(r => ({ ...r, type: 'series' as const })),
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch needs_review content' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: { tmdb_id?: unknown; action?: unknown; type?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }) }

  const { tmdb_id, action, type } = body

  if (!tmdb_id || typeof tmdb_id !== 'number')
    return NextResponse.json({ ok: false, error: 'tmdb_id (number) is required' }, { status: 400 })
  if (action !== 'approve' && action !== 'reject')
    return NextResponse.json({ ok: false, error: "action must be 'approve' or 'reject'" }, { status: 400 })
  if (type !== 'movie' && type !== 'series')
    return NextResponse.json({ ok: false, error: "type must be 'movie' or 'series'" }, { status: 400 })

  const newStatus = action === 'approve' ? 'reviewed_approved' : 'reviewed_rejected'
  const table     = type   === 'movie'   ? 'movies'            : 'tv_series'
  const nowStr    = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const existing = await executeFirst(`SELECT tmdb_id, filter_status FROM ${table} WHERE tmdb_id = ?`, [tmdb_id])
  if (!existing) return NextResponse.json({ ok: false, error: `tmdb_id=${tmdb_id} not found in ${table}` }, { status: 404 })

  const currentStatus = String(existing.filter_status ?? '')

  try {
    await executeAll(`UPDATE ${table} SET filter_status = ?, updated_at = ? WHERE tmdb_id = ?`, [newStatus, nowStr, tmdb_id])
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'D1 update failed — nothing was written' }, { status: 500 })
  }

  const verified = await executeFirst(`SELECT filter_status FROM ${table} WHERE tmdb_id = ?`, [tmdb_id])
  if (verified?.filter_status !== newStatus)
    return NextResponse.json({ ok: false, error: `Verify failed — got '${verified?.filter_status}', expected '${newStatus}'` }, { status: 500 })

  // Best-effort local.db sync
  let localDbSynced = false, localDbWarning = ''
  if (localDb) {
    try {
      const info = localDb.prepare(`UPDATE ${table} SET filter_status = ?, updated_at = ? WHERE tmdb_id = ?`).run(newStatus, nowStr, tmdb_id)
      if (info.changes > 0) localDbSynced = true
      else localDbWarning = `tmdb_id=${tmdb_id} not found in local.db`
    } catch (err) {
      localDbWarning = `local.db update failed: ${err instanceof Error ? err.message : String(err)}`
    }
  } else {
    localDbWarning = 'local.db not available on this server'
  }

  return NextResponse.json({
    ok: true, tmdb_id, type, action,
    previous_status: currentStatus, new_status: newStatus,
    d1_synced: true, local_db_synced: localDbSynced,
    ...(localDbWarning ? { local_db_warning: localDbWarning } : {})
  })
}
