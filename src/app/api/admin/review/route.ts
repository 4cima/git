/**
 * /api/admin/review — طابور مراجعة المحتوى (needs_review).
 * GET: قائمة الأفلام والمسلسلات المنتظرة. POST: موافقة/رفض عنصر بحالة محددة
 * مع نمط الكتابة-ثم-التحقق (SELECT بعد UPDATE). مزامنة local.db best-effort.
 * كلا الـmethodين خلف requireAdmin (كان GET بدون حارس — اتسدت).
 */
import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import localDb from '@/lib/local-db-server'
import { requireAdmin } from '@/lib/requireAdmin'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const [movies, series] = await Promise.all([
      executeAll(
        `SELECT tmdb_id, slug, title_ar, title_en, release_year AS year, vote_average, overview_ar, filter_status, poster_path
         FROM movies WHERE filter_status = 'needs_review' ORDER BY vote_average DESC`,
        [],
      ),
      executeAll(
        `SELECT tmdb_id, slug, name_ar AS title_ar, name_en AS title_en, first_air_year AS year, vote_average, overview_ar, filter_status, poster_path
         FROM tv_series WHERE filter_status = 'needs_review' ORDER BY vote_average DESC`,
        [],
      ),
    ])
    return NextResponse.json(
      {
        ok: true,
        total: movies.length + series.length,
        movies: movies.map((r) => ({ ...r, type: 'movie' as const })),
        series: series.map((r) => ({ ...r, type: 'series' as const })),
      },
      { headers: NO_STORE },
    )
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل جلب قائمة المراجعة' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  let body: { tmdb_id?: unknown; action?: unknown; type?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ ok: false, error: 'JSON غير صالح' }, { status: 400 }) }

  const { tmdb_id, action, type } = body

  if (!tmdb_id || typeof tmdb_id !== 'number')
    return NextResponse.json({ ok: false, error: 'tmdb_id (رقم) مطلوب' }, { status: 400 })
  if (action !== 'approve' && action !== 'reject')
    return NextResponse.json({ ok: false, error: "action يجب أن يكون 'approve' أو 'reject'" }, { status: 400 })
  if (type !== 'movie' && type !== 'series')
    return NextResponse.json({ ok: false, error: "type يجب أن يكون 'movie' أو 'series'" }, { status: 400 })

  const newStatus = action === 'approve' ? 'reviewed_approved' : 'reviewed_rejected'
  const table = type === 'movie' ? 'movies' : 'tv_series'
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const existing = await executeFirst(`SELECT tmdb_id, filter_status FROM ${table} WHERE tmdb_id = ?`, [tmdb_id])
  if (!existing) return NextResponse.json({ ok: false, error: `tmdb_id=${tmdb_id} غير موجود في ${table}` }, { status: 404 })

  const currentStatus = String(existing.filter_status ?? '')

  try {
    await executeAll(`UPDATE ${table} SET filter_status = ?, updated_at = ? WHERE tmdb_id = ?`, [newStatus, nowStr, tmdb_id])
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل تحديث D1 — لم يُكتب شيء' }, { status: 500 })
  }

  // نمط الكتابة-ثم-التحقق: meta.changes غير موثوق — نقرأ الحالة الجديدة فعليًا
  const verified = await executeFirst(`SELECT filter_status FROM ${table} WHERE tmdb_id = ?`, [tmdb_id])
  if (verified?.filter_status !== newStatus)
    return NextResponse.json({ ok: false, error: `فشل التحقق — الحالة '${verified?.filter_status}'` }, { status: 500 })

  // مزامنة local.db محليًا (best-effort — تعمل فقط في بيئة Node)
  let localDbSynced = false
  let localDbWarning = ''
  if (localDb) {
    try {
      const info = localDb
        .prepare(`UPDATE ${table} SET filter_status = ?, updated_at = ? WHERE tmdb_id = ?`)
        .run(newStatus, nowStr, tmdb_id)
      if (info.changes > 0) localDbSynced = true
      else localDbWarning = `tmdb_id=${tmdb_id} غير موجود في local.db`
    } catch (err) {
      localDbWarning = `فشل تحديث local.db: ${err instanceof Error ? err.message : String(err)}`
    }
  } else {
    localDbWarning = 'local.db غير متاح على هذا الخادم (Workers) — شغّل scripts/review-content.js محليًا للمزامنة'
  }

  return NextResponse.json({
    ok: true,
    tmdb_id,
    type,
    action,
    previous_status: currentStatus,
    new_status: newStatus,
    d1_synced: true,
    local_db_synced: localDbSynced,
    ...(localDbWarning ? { local_db_warning: localDbWarning } : {}),
  })
}
