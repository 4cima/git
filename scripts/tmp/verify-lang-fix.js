#!/usr/bin/env node
/**
 * تحقق قراءة فقط (read-only) لإصلاح استعلامات صفحات اللغة:
 * 1) الصيغة الجديدة (anti-join + id tiebreak) لكل اللغات المفردة — EXPLAIN + rows_read
 * 2) الصيغة الجديدة للغة المتعددة (zh,cn) عبر UNION ALL لكل لغة — EXPLAIN + rows_read
 * 3) مقارنة النتائج (السلاجات بالترتيب) قديم/جديد لكل اللغات في الجانبين
 * لا يكتب شيئًا — SELECT و EXPLAIN فقط.
 */
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.local') });

const ACCOUNT_ID  = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const URL_ = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

async function q(sql, params = []) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  const b = await res.json();
  if (!b.success) throw new Error(JSON.stringify(b.errors).slice(0, 400) + ' | sql: ' + sql.slice(0, 80));
  return b.result[0];
}

const LIMIT = 25; // LISTING_PAGE_SIZE + 1

/* ═══ الصيغة القديمة (الحالية في الكود) ═══ */
function oldSql(side) {
  const table = side === 'movie' ? 'movies' : 'tv_series';
  const cols = side === 'movie'
    ? `movies.id, movies.tmdb_id, movies.slug, movies.title_ar, movies.title_en,
       movies.poster_path, movies.backdrop_path, movies.vote_average, movies.release_year,
       movies.genres_json, movies.overview_ar, movies.original_language`
    : `tv_series.id, tv_series.tmdb_id, tv_series.slug,
       tv_series.name_ar AS title_ar, tv_series.name_en AS title_en,
       tv_series.poster_path, tv_series.backdrop_path, tv_series.vote_average, tv_series.first_air_year,
       tv_series.genres_json, tv_series.overview_ar`;
  const yearCond = side === 'movie'
    ? '(movies.release_year IS NOT NULL AND movies.release_year >= 2000)'
    : '(tv_series.first_air_year IS NOT NULL AND tv_series.first_air_year >= 2000)';
  return `SELECT ${cols}
FROM ${table}
WHERE original_language = ?
  AND (genres_json IS NULL OR NOT EXISTS (
    SELECT 1 FROM json_each(${table}.genres_json)
    WHERE json_extract(value, '$.tmdb_id') IN (10767, 10768, 99, 36)
  ))
  AND (IFNULL(${table}.filter_status, 'clean') IN ('clean', 'reviewed_approved'))
  AND ${yearCond}
ORDER BY popularity DESC
LIMIT ${LIMIT}`;
}

/* ═══ الصيغة الجديدة: anti-join على جدول الممنوعات + tiebreak بالـid (مطابقة /api/movies) ═══
   withSortCols: يضمّن popularity/id في الإخراج — مطلوب لفرع الـUNION متعدد اللغات فقط
   كي يرتبه الغلاف الخارجي (الحالة المفردة تحافظ على نفس أعمدة الإخراج القديمة). */
function newBranch(side, withSortCols = false) {
  const table = side === 'movie' ? 'movies' : 'tv_series';
  const eg = side === 'movie' ? 'excluded_genre_movie_ids' : 'excluded_genre_series_ids';
  const cols = (side === 'movie'
    ? `movies.id, movies.tmdb_id, movies.slug, movies.title_ar, movies.title_en,
       movies.poster_path, movies.backdrop_path, movies.vote_average, movies.release_year,
       movies.genres_json, movies.overview_ar, movies.original_language`
    : `tv_series.id, tv_series.tmdb_id, tv_series.slug,
       tv_series.name_ar AS title_ar, tv_series.name_en AS title_en,
       tv_series.poster_path, tv_series.backdrop_path, tv_series.vote_average, tv_series.first_air_year,
       tv_series.genres_json, tv_series.overview_ar`) + (withSortCols ? `, ${table}.popularity, ${table}.id AS sort_id` : '');
  const yearCond = side === 'movie'
    ? '(movies.release_year IS NOT NULL AND movies.release_year >= 2000)'
    : '(tv_series.first_air_year IS NOT NULL AND tv_series.first_air_year >= 2000)';
  return `SELECT ${cols}
FROM ${table}
LEFT JOIN ${eg} eg ON eg.tmdb_id = ${table}.tmdb_id
WHERE ${table}.original_language = ?
  AND (${table}.genres_json IS NULL OR eg.tmdb_id IS NULL)
  AND (IFNULL(${table}.filter_status, 'clean') IN ('clean', 'reviewed_approved'))
  AND ${yearCond}
ORDER BY ${table}.popularity DESC, ${table}.id DESC
LIMIT ${LIMIT}`;
}

/* لغة متعددة: UNION ALL لكل لغة (كل فرع يستخدم idx_*_lang_listing) ثم دمج */
function newSql(side, languages) {
  if (languages.length === 1) return { sql: newBranch(side), params: languages };
  const branches = languages.map(() => `SELECT * FROM (\n${newBranch(side, true)}\n)`).join('\n  UNION ALL\n');
  return {
    sql: `SELECT * FROM (\n${branches}\n) ORDER BY popularity DESC, sort_id DESC LIMIT ${LIMIT}`,
    params: languages,
  };
}

const LANGS = ['ar', 'en', 'tr', 'hi', 'ko', 'ja', 'fr', 'es', 'de']; // مفردة
const MULTI = ['zh', 'cn']; // zh في الـNavbar

(async () => {
  let totalOld = 0, totalNew = 0;
  const issues = [];

  for (const side of ['movie', 'tv']) {
    // المفردة
    for (const lang of LANGS) {
      const oldR = await q(oldSql(side), [lang]);
      const neu = newSql(side, [lang]);
      const plan = (await q('EXPLAIN QUERY PLAN ' + neu.sql, neu.params)).results.map(r => r.detail);
      const newR = await q(neu.sql, neu.params);
      const oldSlugs = oldR.results.map(r => r.slug);
      const newSlugs = newR.results.map(r => r.slug);
      const sameSet = JSON.stringify([...oldSlugs].sort()) === JSON.stringify([...newSlugs].sort());
      const sameOrder = JSON.stringify(oldSlugs) === JSON.stringify(newSlugs);
      totalOld += (oldR.meta || {}).rows_read || 0;
      totalNew += (newR.meta || {}).rows_read || 0;
      const flag = sameSet ? (sameOrder ? 'OK' : 'SET-OK/TIE-ORDER') : '❌DIFF';
      if (flag !== 'OK') issues.push(`${side} ${lang}: ${flag}`);
      console.log(`${side} ${lang}: old_read=${(oldR.meta||{}).rows_read} new_read=${(newR.meta||{}).rows_read} rows=${newR.results.length} ${flag} idxUsed=${plan.some(p=>/lang_listing/.test(p))}`);
    }
    // المتعددة (zh,cn)
    const multiIn = oldSql(side).replace('original_language = ?', `original_language IN (${MULTI.map(()=>'?').join(',')})`);
    const oldR = await q(multiIn, MULTI);
    const neu = newSql(side, MULTI);
    const plan = (await q('EXPLAIN QUERY PLAN ' + neu.sql, neu.params)).results.map(r => r.detail);
    const newR = await q(neu.sql, neu.params);
    const oldSlugs = oldR.results.map(r => r.slug);
    const newSlugs = newR.results.map(r => r.slug);
    const sameSet = JSON.stringify([...oldSlugs].sort()) === JSON.stringify([...newSlugs].sort());
    const sameOrder = JSON.stringify(oldSlugs) === JSON.stringify(newSlugs);
    totalOld += (oldR.meta || {}).rows_read || 0;
    totalNew += (newR.meta || {}).rows_read || 0;
    const flag = sameSet ? (sameOrder ? 'OK' : 'SET-OK/TIE-ORDER') : '❌DIFF';
    if (flag !== 'OK') issues.push(`${side} zh,cn: ${flag}`);
    console.log(`${side} zh,cn(union): old_read=${(oldR.meta||{}).rows_read} new_read=${(newR.meta||{}).rows_read} rows=${newR.results.length} ${flag}`);
    console.log('  plans:\n    ' + plan.join('\n    '));
  }

  console.log('\n===== إجمالي (18 استعلامًا) =====');
  console.log(`rows_read قديم=${totalOld}  جديد=${totalNew}  (${(totalOld/totalNew).toFixed(0)}×)`);
  console.log(issues.length ? '⚠️ ' + issues.join(' | ') : '✅ كل اللغات: نفس النتائج وبنفس الترتيب');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
