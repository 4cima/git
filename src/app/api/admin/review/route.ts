import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import localDb from '@/lib/local-db-server'

// ─────────────────────────────────────────────────────────────
// GET /api/admin/review
// Returns all movies + tv_series with filter_status = 'needs_review'
// ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const [moviesRes, seriesRes] = await Promise.all([
      turso.execute({
        sql: `SELECT
                tmdb_id,
                slug,
                title_ar,
                title_en,
                release_year   AS year,
                vote_average,
                overview_ar,
                filter_status,
                poster_path
              FROM movies
              WHERE filter_status = 'needs_review'
              ORDER BY vote_average DESC`,
        args: [],
      }),
      turso.execute({
        sql: `SELECT
                tmdb_id,
                slug,
                name_ar        AS title_ar,
                name_en        AS title_en,
                first_air_year AS year,
                vote_average,
                overview_ar,
                filter_status,
                poster_path
              FROM tv_series
              WHERE filter_status = 'needs_review'
              ORDER BY vote_average DESC`,
        args: [],
      }),
    ])

    const movies = (moviesRes.rows || []).map((r) => ({ ...r, type: 'movie'  as const }))
    const series = (seriesRes.rows || []).map((r) => ({ ...r, type: 'series' as const }))

    return NextResponse.json({
      ok:     true,
      total:  movies.length + series.length,
      movies,
      series,
    })
  } catch (error) {
    console.error('[GET /api/admin/review]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch needs_review content' },
      { status: 500 },
    )
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/admin/review
// Body: { tmdb_id: number, action: 'approve' | 'reject', type: 'movie' | 'series' }
//
// Write order:
//   1. Validate input
//   2. Confirm row exists in Turso
//   3. Update Turso  → if fails, return 500 (nothing written yet)
//   4. Verify Turso write
//   5. Update local.db → if fails, return ok:true + local_db_synced:false
//      (Turso is the source of truth for the live site; local.db mismatch
//       is recoverable via CLI; a full rollback is unnecessary)
// ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: { tmdb_id?: unknown; action?: unknown; type?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { tmdb_id, action, type } = body

  // ── Validate ──────────────────────────────────────────────
  if (!tmdb_id || typeof tmdb_id !== 'number') {
    return NextResponse.json(
      { ok: false, error: 'tmdb_id (number) is required' },
      { status: 400 },
    )
  }
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { ok: false, error: "action must be 'approve' or 'reject'" },
      { status: 400 },
    )
  }
  if (type !== 'movie' && type !== 'series') {
    return NextResponse.json(
      { ok: false, error: "type must be 'movie' or 'series'" },
      { status: 400 },
    )
  }

  const newStatus = action === 'approve' ? 'reviewed_approved' : 'reviewed_rejected'
  const table     = type   === 'movie'   ? 'movies'            : 'tv_series'
  const nowStr    = new Date().toISOString().replace('T', ' ').slice(0, 19)

  // ── 1. Confirm row exists ─────────────────────────────────
  const checkRes = await turso.execute({
    sql:  `SELECT tmdb_id, filter_status FROM ${table} WHERE tmdb_id = ?`,
    args: [tmdb_id],
  })

  if (!checkRes.rows || checkRes.rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: `tmdb_id=${tmdb_id} not found in ${table}` },
      { status: 404 },
    )
  }

  const currentStatus = String(checkRes.rows[0].filter_status ?? '')
  if (currentStatus !== 'needs_review') {
    console.warn(
      `[POST /api/admin/review] tmdb_id=${tmdb_id} status='${currentStatus}' (not needs_review). Updating anyway.`,
    )
  }

  // ── 2. Update Turso ───────────────────────────────────────
  try {
    await turso.execute({
      sql:  `UPDATE ${table} SET filter_status = ?, updated_at = ? WHERE tmdb_id = ?`,
      args: [newStatus, nowStr, tmdb_id],
    })
  } catch (err) {
    console.error('[POST /api/admin/review] Turso update failed', err)
    return NextResponse.json(
      { ok: false, error: 'Turso update failed — nothing was written' },
      { status: 500 },
    )
  }

  // ── 3. Verify Turso write ─────────────────────────────────
  const verifyRes = await turso.execute({
    sql:  `SELECT filter_status FROM ${table} WHERE tmdb_id = ?`,
    args: [tmdb_id],
  })
  const confirmed = verifyRes.rows?.[0]?.filter_status

  if (confirmed !== newStatus) {
    return NextResponse.json(
      {
        ok:    false,
        error: `Turso verify failed — got '${confirmed}', expected '${newStatus}'`,
      },
      { status: 500 },
    )
  }

  // ── 4. Update local.db (best-effort) ─────────────────────
  let localDbSynced  = false
  let localDbWarning = ''

  try {
    const stmt = localDb.prepare(
      `UPDATE ${table} SET filter_status = ?, updated_at = ? WHERE tmdb_id = ?`
    )
    const info = stmt.run(newStatus, nowStr, tmdb_id)

    if (info.changes > 0) {
      localDbSynced = true
    } else {
      // Row not in local.db yet (not yet ingested locally) — not a real error
      localDbWarning = `tmdb_id=${tmdb_id} not found in local.db (may not be ingested yet)`
      console.warn(`[POST /api/admin/review] ${localDbWarning}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    localDbWarning = `local.db update failed: ${msg}`
    console.error(`[POST /api/admin/review] ${localDbWarning}`)
  }

  // ── 5. Return result ──────────────────────────────────────
  return NextResponse.json({
    ok:               true,
    tmdb_id,
    type,
    action,
    previous_status:  currentStatus,
    new_status:       newStatus,
    turso_synced:     true,
    local_db_synced:  localDbSynced,
    ...(localDbWarning ? { local_db_warning: localDbWarning } : {}),
  })
}