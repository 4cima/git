#!/usr/bin/env node
/**
 * backfill-countries.js — تعبئة country_of_origin + countries_json لجدول tv_series من TMDB.
 *
 * الخلفية (قياس 2026-09-16): tv_series.countries_json فارغ 100% (0/38,338) و
 * country_of_origin ناقص في 5,226 مسلسل (13.6%) — وفلتر الدولة في /api/series يعتمد عليهما.
 *
 * الاستخدام:
 *   node scripts/backfill-countries.js --dry-run            # يسحب من TMDB ولا يكتب في D1 إطلاقاً
 *   node scripts/backfill-countries.js                      # تنفيذ فعلي (كتابة batch 50)
 *   node scripts/backfill-countries.js --resume             # استئناف من نقطة الحفظ (checkpoint)
 *   node scripts/backfill-countries.js --limit 100          # تجربة على عينة
 *   node scripts/backfill-countries.js --force              # إعادة تعبئة حتى المملوء مسبقاً
 *
 * الأمان:
 * - يقرأ TMDB_API_KEY + CLOUDFLARE_D1_TOKEN من .env.local فقط (لا يعدّل أي ملف env).
 * - rate limit ~40 طلب/ثانية (chunks من 40 مع سكون ثانية بين الchunks).
 * - dry-run: صفر كتابة في D1.
 * - فشل طلب ⇒ retry ×3 backoff، ثم يُسجَّل في failures ويُتخطى.
 * - checkpoint كل 1000 عنصر ⇒ قابل للاستئناف بلا إعادة سحب.
 * - الكتابة: UPDATE مجمّعة (CASE) لكل 50 صف — لا حذف ولا تعديل أعمدة أخرى.
 */
'use strict'

const fs = require('fs')
const path = require('path')

/* ── env ── */
function loadEnv() {
  const env = {}
  const file = path.join(process.cwd(), '.env.local')
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}
const ENV = loadEnv()
const TMDB_KEY = ENV.TMDB_API_KEY
const CF_TOKEN = ENV.CLOUDFLARE_D1_TOKEN
/* ثوابت الحساب/القاعدة — نفسها المستخدمة في src/lib/db.ts (D1 الإنتاج) */
const CF_ACCOUNT = '834bca43d616c73db23cf95311cfe17e'
const CF_DB = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6'
if (!TMDB_KEY || !CF_TOKEN) {
  console.error('FATAL: TMDB_API_KEY أو CLOUDFLARE_D1_TOKEN غير موجودين في .env.local')
  process.exit(1)
}

/* ── args ── */
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const RESUME = args.includes('--resume')
const FORCE = args.includes('--force')
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0
const chunkIdx = args.indexOf('--chunk')
/* chunk أكبر يعوّض انتظار أبطأ طلب في الدفعة ليقارب المعدل المستهدف 40/ث */
const CHUNK = chunkIdx >= 0 ? Math.min(150, Math.max(10, parseInt(args[chunkIdx + 1], 10))) : 40
const BATCH = 50      // حجم دفعة كتابة D1
const CHECKPOINT = path.join(process.cwd(), 'tmp-backfill-countries-checkpoint.json')

/* ── D1 helper ── */
async function d1(sql, params = []) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
    signal: AbortSignal.timeout(60000),
  })
  const j = await r.json()
  if (!j.success) throw new Error('D1: ' + JSON.stringify(j.errors))
  return j.result[0].results
}

/* ── TMDB helper (retry ×3) ── */
async function tmdbTv(id) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}`, { signal: AbortSignal.timeout(20000) })
      if (r.status === 404) return { notFound: true }
      if (r.status === 429) {
        await new Promise(res => setTimeout(res, 1500 * attempt))
        continue
      }
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const j = await r.json()
      return { countries: Array.isArray(j.origin_country) ? j.origin_country : [] }
    } catch (e) {
      if (attempt === 3) return { error: e.message }
      await new Promise(res => setTimeout(res, 1000 * attempt))
    }
  }
}

/* ── checkpoint ── */
function loadCheckpoint() {
  if (RESUME && fs.existsSync(CHECKPOINT)) {
    const c = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'))
    console.log(`[resume] استئناف: ${Object.keys(c.fetched).length} مُسحوب، ${c.noOrigin.length} بلا أصل، ${c.notFound.length} 404، ${c.errors.length} خطأ`)
    return c
  }
  return { fetched: {}, noOrigin: [], notFound: [], errors: [] }
}
function saveCheckpoint(cp) { fs.writeFileSync(CHECKPOINT, JSON.stringify(cp)) }

/* ── main ── */
;(async () => {
  console.log(`=== backfill-countries | mode=${DRY_RUN ? 'DRY-RUN (بلا كتابة)' : 'LIVE (كتابة فعلياً)'} | limit=${LIMIT || 'الكل'} ===`)

  const rows = await d1(
    `SELECT tmdb_id, name_en, country_of_origin, countries_json
     FROM tv_series
     WHERE (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)
       AND first_air_year >= 2000
     ORDER BY tmdb_id`
  )
  const targets = (LIMIT ? rows.slice(0, LIMIT) : rows).filter(r => FORCE || !r.countries_json || r.countries_json === '[]' || r.countries_json === '')
  console.log(`[d1] إجمالي المؤهلين: ${rows.length} | المطلوب سحبه: ${targets.length}${FORCE ? '' : ' (بعد استبعاد المملوء مسبقاً)'}`)

  const cp = loadCheckpoint()
  const pending = targets.filter(r => !(r.tmdb_id in cp.fetched) && !cp.noOrigin.includes(r.tmdb_id) && !cp.notFound.includes(r.tmdb_id))
  console.log(`[plan] سيُسحب الآن: ${pending.length} (الباقي من checkpoint) | rate ≈ ${CHUNK}/ث`)

  const stats = { checked: 0, wouldChange: 0, written: 0, noOrigin: 0, notFound: 0, errors: 0, skipped: 0 }
  const examples = []
  const buffer = [] // نتائج جاهزة للكتابة (live فقط)

  async function flushBatch() {
    if (DRY_RUN || buffer.length === 0) { buffer.length = 0; return }
    const ids = buffer.map(b => b.id)
    const firstCases = buffer.map(b => `WHEN ${b.id} THEN ${b.first ? `'${b.first}'` : 'NULL'}`).join(' ')
    const jsonCases = buffer.map(b => `WHEN ${b.id} THEN '${b.json.replace(/'/g, "''")}'`).join(' ')
    try {
      await d1(
        `UPDATE tv_series SET
           country_of_origin = CASE tmdb_id ${firstCases} ELSE country_of_origin END,
           countries_json    = CASE tmdb_id ${jsonCases} ELSE countries_json END
         WHERE tmdb_id IN (${ids.join(',')})`
      )
      stats.written += buffer.length
    } catch (e) {
      console.error(`[batch-error] فشلت دفعة (${buffer.length} صف): ${e.message}`)
      cp.errors.push({ ids, reason: e.message })
      stats.errors += buffer.length
    }
    buffer.length = 0
  }

  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK)
    const results = await Promise.all(chunk.map(async row => ({ row, res: await tmdbTv(row.tmdb_id) })))

    for (const { row, res } of results) {
      if (res.notFound) { cp.notFound.push(row.tmdb_id); stats.notFound++; continue }
      if (res.error) { cp.errors.push({ id: row.tmdb_id, reason: res.error }); stats.errors++; continue }
      if (!res.countries || res.countries.length === 0) { cp.noOrigin.push(row.tmdb_id); stats.noOrigin++; continue }

      const json = JSON.stringify(res.countries)
      const first = res.countries[0]
      cp.fetched[row.tmdb_id] = res.countries
      stats.checked++

      const changed = row.country_of_origin !== first || !row.countries_json || row.countries_json === '[]' || row.countries_json === ''
      if (changed) {
        stats.wouldChange++
        if (examples.length < 20) {
          examples.push({ id: row.tmdb_id, name: row.name_en, old: row.country_of_origin, new: first, json })
        }
        buffer.push({ id: row.tmdb_id, first, json })
        if (buffer.length >= BATCH) await flushBatch()
      } else {
        stats.skipped++
      }
    }

    const done = i + chunk.length
    if (done % 500 < CHUNK || done === pending.length) {
      console.log(`[progress] ${done}/${pending.length} | checked=${stats.checked} wouldChange=${stats.wouldChange} noOrigin=${stats.noOrigin} notFound=${stats.notFound} errors=${stats.errors}${DRY_RUN ? '' : ' written=' + stats.written}`)
      saveCheckpoint(cp)
    }
    if (!DRY_RUN) saveCheckpoint(cp)
    /* إيقاع ~40 طلب/ثانية: chunk من 40 ثم سكون ثانية */
    if (i + CHUNK < pending.length) await new Promise(res => setTimeout(res, 1000))
  }
  await flushBatch()
  if (DRY_RUN) saveCheckpoint(cp)

  /* ── ملخص ── */
  console.log('\n=== الملخص ===')
  console.log(`mode=${DRY_RUN ? 'DRY-RUN' : 'LIVE'} | checked=${stats.checked} | ${DRY_RUN ? 'wouldChange' : 'written'}=${DRY_RUN ? stats.wouldChange : stats.written}`)
  console.log(`noOrigin=${stats.noOrigin} | notFound=${stats.notFound} | errors=${stats.errors} | unchanged=${stats.skipped}`)
  if (examples.length) {
    console.log('\n=== أمثلة (حتى 20) ===')
    for (const ex of examples) console.log(`  ${ex.id} | ${ex.name} | ${ex.old || 'NULL'} → ${ex.new} | ${ex.json}`)
  }
  if (cp.errors.length) console.log(`\n[failures] ${cp.errors.length} — أول 10: ${JSON.stringify(cp.errors.slice(0, 10))}`)
  console.log(DRY_RUN ? '\nDRY-RUN اكتمل — لم تُكتب أي صف في D1.' : '\nالتنفيذ اكتمل.')
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
