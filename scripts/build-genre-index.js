#!/usr/bin/env node
/**
 * scripts/build-genre-index.js
 *
 * يبني جداول فهرسة التصنيفات المُجمَّعة (مادة materialized) لاستعلامات القوائم:
 *
 *   movies_by_genre(genre_id, tmdb_id, id, popularity, vote_average, vote_count, release_year)
 *   series_by_genre(genre_id, tmdb_id, id, popularity, vote_average, vote_count, first_air_year)
 *   excluded_genre_movie_ids(tmdb_id)  /  excluded_genre_series_ids(tmdb_id)
 *
 * لماذا: فلتر التصنيف الحي (EXISTS json_each على genres_json) يمسح الجدول كاملًا
 * (~410 ألف صف/نداء على D1). الجداول الجديدة تجعل المطابقة بحث نطاقي على
 * PK مركّب (genre_id, sort_key) ⇒ ~25-50 صفًا/نداء.
 *
 * قواعد العضوية — يجب أن تطابق الكود الحرفيًا:
 *   - الأفلام: وجود معرّف التصنيف داخل genres_json (1:1).
 *   - المسلسلات: قواعد التفريق في src/lib/genre-siblings.ts (buildTvGenreClause):
 *       28 (action)   = has(10759) AND NOT has(53,10765,14,878)
 *       12 (adventure)= has(10765) AND has(10759) AND NOT has(16)
 *       27 (horror)   = has(9648) AND has(10765)
 *       14 (fantasy)  = has(10765) AND has(16)
 *       878 (sci-fi)  = has(878) OR (has(10765) AND NOT has(10759) AND NOT has(16))
 *       غير ذلك       = has(getTvGenreIds(gid)) — أي عضوية (IN = ANY)
 *     ⚠️ أي تعديل مستقبلي على buildTvGenreClause يستلزم إعادة تشغيل هذا السكربت.
 *
 * البوابات (مطابقة لبوابات الـAPI حرفيًا):
 *   IFNULL(filter_status,'clean') IN ('clean','reviewed_approved')
 *   AND سنة >= 2000 AND tmdb_id IS NOT NULL
 *   AND لا يحوي أي تصنيف ممنوع (10767, 10768, 99, 36) — الممنوع يُجمَع في
 *   جداول excluded_* ليستخدمها الـanti-join في مسار «بلا تصنيف».
 *
 * التشغيل:  node scripts/build-genre-index.js
 * يتطلب:    CLOUDFLARE_D1_TOKEN (أو CF_CACHE_PURGE_TOKEN لا يصلح) في البيئة أو .env.local
 *
 * ⚠️ إعادة التشغيل idempotent: تحذف وتعيد بناء نفس الجداول (INSERT OR REPLACE).
 */

const fs = require('fs')
const path = require('path')

/* ---------- إعداد الاتصال بـ D1 (نمط سكربتات المشروع) ---------- */
function loadEnv() {
  const out = {}
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (m) out[m[1]] = m[2].trim()
    }
  } catch {}
  return out
}

const env = { ...loadEnv(), ...process.env }
const ACCOUNT_ID = env.CF_Account_ID || env.CLOUDFLARE_ACCOUNT_ID
const DB_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6' // hardcoded في src/lib/db.ts
const TOKEN = env.CLOUDFLARE_D1_TOKEN

if (!ACCOUNT_ID || !TOKEN) {
  console.error('❌ ناقص CLOUDFLARE_D1_TOKEN أو CF_Account_ID')
  process.exit(1)
}

async function d1(sql, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    }
  )
  const json = await res.json()
  if (!json.success) {
    throw new Error(`D1 error: ${JSON.stringify(json.errors)} | sql: ${sql.slice(0, 120)}`)
  }
  return json.result?.[0]?.results || []
}

/* ---------- قواعد العضوية ---------- */
const EXCLUDED_IDS = [10767, 10768, 99, 36]

/** قواعد تفريق TV — نسخة مادية من buildTvGenreClause (genre-siblings.ts) */
function seriesMembership(gid, genreSet) {
  const has = (ids) => ids.some((id) => genreSet.has(id))
  if (gid === 28) return has([10759]) && !has([53, 10765, 14, 878])
  if (gid === 12) return has([10765]) && has([10759]) && !has([16])
  if (gid === 27) return has([9648]) && has([10765])
  if (gid === 14) return has([10765]) && has([16])
  if (gid === 878) return has([878]) || (has([10765]) && !has([10759]) && !has([16]))
  if (gid === 53) return has([9648, 80])
  if (gid === 10752) return has([10768])
  return has([gid])
}

const num = (v) => (v == null ? 0 : Number(v) || 0)

/* ---------- البناء ---------- */
async function buildSide(side) {
  const table = side === 'movie' ? 'movies' : 'tv_series'
  const yearCol = side === 'movie' ? 'release_year' : 'first_air_year'
  const byGenre = side === 'movie' ? 'movies_by_genre' : 'series_by_genre'
  const excludedTable = side === 'movie' ? 'excluded_genre_movie_ids' : 'excluded_genre_series_ids'
  console.log(`\n=== ${side}: قراءة الكتالوج (مجمّعات عبر id) ===`)
  const genres = await d1('SELECT tmdb_id FROM genres')
  const genreIds = genres.map((g) => Number(g.tmdb_id)).filter(Number.isFinite)
  console.log(`genres: ${genreIds.length}`)

  const rows = [] // صفوف الجدول المجمّع
  const excludedIds = new Set()
  let lastId = 0
  let scanned = 0
  let kept = 0

  for (;;) {
    const batch = await d1(
      `SELECT id, tmdb_id, popularity, vote_average, vote_count, ${yearCol} AS y, genres_json
       FROM ${table}
       WHERE id > ? AND (IFNULL(filter_status,'clean') IN ('clean','reviewed_approved'))
         AND ${yearCol} IS NOT NULL AND ${yearCol} >= 2000
         AND tmdb_id IS NOT NULL
       ORDER BY id LIMIT 5000`,
      [lastId]
    )
    if (batch.length === 0) break
    for (const r of batch) {
      lastId = Math.max(lastId, Number(r.id))
      scanned++
      let set
      try {
        const parsed = JSON.parse(String(r.genres_json || '[]'))
        set = new Set(Array.isArray(parsed) ? parsed.map((g) => Number(g?.tmdb_id)).filter(Number.isFinite) : [])
      } catch {
        set = new Set()
      }
      if (EXCLUDED_IDS.some((id) => set.has(id))) {
        excludedIds.add(Number(r.tmdb_id))
        continue
      }
      kept++
      const base = [num(r.tmdb_id), num(r.id), num(r.popularity), num(r.vote_average), num(r.vote_count), num(r.y)]
      for (const gid of genreIds) {
        const member = side === 'movie' ? set.has(gid) : seriesMembership(gid, set)
        if (member) rows.push([gid, ...base])
      }
    }
    console.log(`  scanned=${scanned} kept=${kept} mappingRows=${rows.length}`)
  }

  console.log(`=== ${side}: كتابة ${rows.length} صفًا في ${byGenre} + ${excludedIds.size} ممنوعًا ===`)

  /* الجداول + الفهارس (idempotent) — عمود السنة باسمه الحقيقي لكل طرف */
  await d1(`CREATE TABLE IF NOT EXISTS ${byGenre} (
    genre_id INTEGER NOT NULL,
    tmdb_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    popularity REAL NOT NULL DEFAULT 0,
    vote_average REAL NOT NULL DEFAULT 0,
    vote_count INTEGER NOT NULL DEFAULT 0,
    ${yearCol} INTEGER,
    PRIMARY KEY (genre_id, popularity, id)
  )`)
  await d1(`CREATE INDEX IF NOT EXISTS idx_${byGenre}_va ON ${byGenre}(genre_id, vote_average, id)`)
  await d1(`CREATE INDEX IF NOT EXISTS idx_${byGenre}_vc ON ${byGenre}(genre_id, vote_count, id)`)
  await d1(`CREATE INDEX IF NOT EXISTS idx_${byGenre}_ry ON ${byGenre}(genre_id, ${yearCol}, id)`)
  await d1(`CREATE TABLE IF NOT EXISTS ${excludedTable} (tmdb_id INTEGER PRIMARY KEY)`)

  await d1(`DELETE FROM ${byGenre}`)
  await d1(`DELETE FROM ${excludedTable}`)

  /* INSERT بدفعات — قيم رقمية فقط (مولّدة من عندنا) فالدمج الآمن */
  const CHUNK = 400
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const values = chunk
      .map((r) => `(${r.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)).join(',')})`)
      .join(',')
    await d1(`INSERT OR REPLACE INTO ${byGenre} (genre_id, tmdb_id, id, popularity, vote_average, vote_count, ${yearCol}) VALUES ${values}`)
    if ((i / CHUNK) % 25 === 0) console.log(`  inserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`)
  }

  const exIds = [...excludedIds]
  for (let i = 0; i < exIds.length; i += 400) {
    const chunk = exIds.slice(i, i + 400)
    await d1(`INSERT OR REPLACE INTO ${excludedTable} (tmdb_id) VALUES ${chunk.map((id) => `(${id})`).join(',')}`)
  }

  const verify = await d1(`SELECT COUNT(*) AS n FROM ${byGenre}`)
  console.log(`✅ ${byGenre}: ${verify[0]?.n} صفًا | ${excludedTable}: ${excludedIds.size}`)
}

;(async () => {
  const started = Date.now()
  await buildSide('movie')
  await buildSide('series')
  console.log(`\n✅ اكتمل في ${Math.round((Date.now() - started) / 1000)} ثانية`)
})().catch((e) => {
  console.error('❌ فشل:', e.message)
  process.exit(1)
})
