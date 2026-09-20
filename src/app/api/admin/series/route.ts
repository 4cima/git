/**
 * /api/admin/series — إدارة المسلسلات من اللوحة (مرآة movies بأعمدة tv_series).
 * GET: بلا بوابة filter_status + ترقيم page ≤ 100. PATCH/DELETE + requireAdmin + مسح كاش.
 */
import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'
import { purgeCloudflareCache } from '@/lib/cloudflare-cache'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

const PATCHABLE_SERIES_COLS = new Set([
  'name_ar', 'name_en', 'overview_ar', 'first_air_year',
  'vote_average', 'number_of_seasons', 'number_of_episodes',
  'status', 'trailer_key', 'poster_path', 'backdrop_path', 'filter_status',
])

const STATUSES = ['clean', 'needs_review', 'reviewed_approved', 'reviewed_rejected', 'blocked']

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const sp = request.nextUrl.searchParams
    const page = Math.min(100, Math.max(1, parseInt(sp.get('page') || '1') || 1))
    const limit = Math.min(60, Math.max(1, parseInt(sp.get('limit') || '20') || 20))
    const offset = (page - 1) * limit
    const search = (sp.get('search') || '').trim().slice(0, 80)
    const status = sp.get('filter_status') || ''
    const sort = sp.get('sort') || 'updated_at'
    const order = sp.get('order') === 'asc' ? 'ASC' : 'DESC'

    const where: string[] = []
    const args: (string | number)[] = []
    if (search) {
      where.push('(name_ar LIKE ? OR name_en LIKE ? OR CAST(tmdb_id AS TEXT) = ?)')
      args.push(`%${search}%`, `%${search}%`, search)
    }
    if (status === 'other') {
      where.push(`(filter_status IS NULL OR filter_status NOT IN (${STATUSES.map(() => '?').join(',')}))`)
      args.push(...STATUSES)
    } else if (STATUSES.includes(status)) {
      where.push('filter_status = ?')
      args.push(status)
    }

    const sortCol = ['updated_at', 'first_air_year', 'vote_average', 'popularity', 'name_ar'].includes(sort) ? sort : 'updated_at'
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const rows = await executeAll(
      `SELECT tmdb_id, slug, name_ar, name_en, poster_path, first_air_year, vote_average, filter_status, updated_at
       FROM tv_series ${whereSql}
       ORDER BY ${sortCol} ${order}, tmdb_id ${order}
       LIMIT ? OFFSET ?`,
      [...args, limit + 1, offset],
    )
    const hasMore = rows.length > limit
    if (hasMore) rows.pop()

    return NextResponse.json({ ok: true, series: rows, pagination: { page, limit, hasMore } }, { headers: NO_STORE })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500, headers: NO_STORE })
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

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
    .filter(([, v]) => v !== undefined)

  if (safe.length === 0)
    return NextResponse.json({ ok: false, error: 'No patchable fields provided' }, { status: 400 })

  const check = await executeFirst('SELECT tmdb_id FROM tv_series WHERE tmdb_id = ?', [tmdb_id])
  if (!check) return NextResponse.json({ ok: false, error: `tmdb_id=${tmdb_id} not found` }, { status: 404 })

  const setClauses = safe.map(([k]) => `${k} = ?`).join(', ')
  const args = [...safe.map(([, v]) => v as string | number | boolean | null), new Date().toISOString().replace('T', ' ').slice(0, 19), tmdb_id]
  await executeAll(`UPDATE tv_series SET ${setClauses}, updated_at = ? WHERE tmdb_id = ?`, args)

  const updated = await executeFirst('SELECT tmdb_id, name_ar, name_en, filter_status, updated_at FROM tv_series WHERE tmdb_id = ?', [tmdb_id])

  const purge = await purgeCloudflareCache().catch(() => ({ ok: false }))

  return NextResponse.json({ ok: true, tmdb_id, updated, cache_purged: purge.ok })
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  let body: { tmdb_id?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }

  const { tmdb_id } = body
  if (!tmdb_id || typeof tmdb_id !== 'number')
    return NextResponse.json({ ok: false, error: 'tmdb_id (number) required' }, { status: 400 })

  const check = await executeFirst('SELECT tmdb_id, name_en, name_ar FROM tv_series WHERE tmdb_id = ?', [tmdb_id])
  if (!check) return NextResponse.json({ ok: false, error: `tmdb_id=${tmdb_id} not found` }, { status: 404 })

  await executeAll('DELETE FROM tv_series WHERE tmdb_id = ?', [tmdb_id])

  const verify = await executeFirst('SELECT tmdb_id FROM tv_series WHERE tmdb_id = ?', [tmdb_id])
  if (verify) return NextResponse.json({ ok: false, error: 'Delete failed — row still exists' }, { status: 500 })

  const purge = await purgeCloudflareCache().catch(() => ({ ok: false }))

  return NextResponse.json({ ok: true, tmdb_id, deleted_name: check.name_ar || check.name_en, cache_purged: purge.ok })
}
