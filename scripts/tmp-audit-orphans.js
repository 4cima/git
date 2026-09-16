#!/usr/bin/env node
/**
 * scripts/tmp-audit-orphans.js (مؤقت — قراءة فقط)
 * فحص أيتام list_* + similar + short_titles_lookup على Cloudflare D1 بعد حذف 285.
 * SELECT فقط — بلا أي DELETE/UPDATE/sync.
 * شرط visitable — movies: is_complete=1 AND release_year>=2000 AND (filter_status IN
 * ('clean','reviewed_approved') OR NULL) — tv_series: نفسه بـ first_air_year.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const fs = require('fs'), path = require('path');
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
if (!TOKEN) { console.error('ERROR: CLOUDFLARE_D1_TOKEN missing in .env.local'); process.exit(1); }

const VM = `SELECT tmdb_id FROM movies WHERE is_complete=1 AND release_year IS NOT NULL AND release_year>=2000 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)`;
const VS = `SELECT tmdb_id FROM tv_series WHERE is_complete=1 AND first_air_year IS NOT NULL AND first_air_year>=2000 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)`;

async function d1(sql, attempt = 1) {
  const delays = [0, 5000, 10000, 20000, 30000];
  if (delays[attempt - 1]) await new Promise(r => setTimeout(r, delays[attempt - 1]));
  const res = await fetch(D1_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if ((res.status === 429 || t.includes('7429') || t.includes('timeout')) && attempt < 5) return d1(sql, attempt + 1);
    throw new Error(`D1 ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  if (!j.success) {
    const m = (j.errors ?? []).map(e => `[${e.code}] ${e.message}`).join(', ');
    if ((m.includes('7429') || m.includes('timeout')) && attempt < 5) return d1(sql, attempt + 1);
    throw new Error(`D1 fail: ${m}`);
  }
  return j.result?.[0]?.results ?? [];
}

const OW = (v) => `tmdb_id IS NULL OR tmdb_id NOT IN (${v})`;
const TABLES = [
  'list_movies_genre', 'list_movies_newest', 'list_movies_popular', 'list_movies_top_rated',
  'list_series_genre', 'list_series_newest', 'list_series_popular', 'list_series_top_rated',
  'movie_similar_cache', 'series_similar_cache',
];

(async () => {
  const L = [];
  const log = (s = '') => { console.log(s); L.push(s); };
  log('════════════════════════════════════════════════════════');
  log('فحص أيتام list_* + similar + short_titles_lookup — قراءة فقط (D1 SELECT)');
  log(`التاريخ: ${new Date().toISOString()}`);
  log('════════════════════════════════════════════════════════\n');
  const summary = [];

  for (const name of TABLES) {
    const movie = name.startsWith('list_movies') || name === 'movie_similar_cache';
    const simple = name.endsWith('similar_cache');
    const v = movie ? VM : VS;
    const yCol = movie ? 'release_year' : 'first_air_year';
    const where = OW(v);
    const total = (await d1(`SELECT COUNT(*) c FROM ${name}`))[0].c;
    const cnt = (await d1(`SELECT COUNT(*) c FROM ${name} WHERE ${where}`))[0].c;
    let sample = [], all = [];
    if (simple) {
      sample = await d1(`SELECT tmdb_id FROM ${name} WHERE ${where} ORDER BY tmdb_id LIMIT 5`);
      if (cnt > 0) all = await d1(`SELECT tmdb_id FROM ${name} WHERE ${where} ORDER BY tmdb_id`);
    } else {
      sample = await d1(`SELECT id, tmdb_id, slug, ${yCol} y FROM ${name} WHERE ${where} ORDER BY id LIMIT 5`);
      if (cnt > 0) all = await d1(`SELECT id, tmdb_id, slug, ${yCol} y FROM ${name} WHERE ${where} ORDER BY id`);
    }
    summary.push({ name, total, orphan: cnt });
    log(`── ${name} ──`);
    log(`   الإجمالي: ${total} | الأيتام: ${cnt}`);
    log('   عيّنة (5):');
    if (!sample.length) log('      (لا يوجد)');
    for (const r of sample) log(simple ? `      tmdb_id=${r.tmdb_id}` : `      id=${r.id} | tmdb_id=${r.tmdb_id} | slug=${r.slug} | ${yCol}=${r.y}`);
    if (cnt > 0) {
      log(`   ⚠ القائمة الكاملة (${cnt}):`);
      for (const r of all) log(simple ? `      ${r.tmdb_id}` : `      id=${r.id} | tmdb_id=${r.tmdb_id} | slug=${r.slug} | ${yCol}=${r.y}`);
    }
    log('');
  }

// ─── short_titles_lookup (مفتاح: source_id + media_type) ───
  {
    const name = 'short_titles_lookup';
    const total = (await d1(`SELECT COUNT(*) c FROM ${name}`))[0].c;
    log(`── ${name} ──`);
    log(`   الإجمالي: ${total}`);
    const byT = await d1(`SELECT media_type, COUNT(*) c FROM ${name} GROUP BY media_type`);
    for (const r of byT) log(`      media_type=${r.media_type ?? 'NULL'} → ${r.c}`);

    const where = `(media_type='movie' AND (source_id IS NULL OR source_id NOT IN (${VM})))
 OR (media_type='tv' AND (source_id IS NULL OR source_id NOT IN (${VS})))
 OR media_type NOT IN ('movie','tv')`;
    const cnt = (await d1(`SELECT COUNT(*) c FROM ${name} WHERE ${where}`))[0].c;
    log(`   الأيتام: ${cnt}`);
    log('   عيّنة (5):');
    const sample = await d1(`SELECT id, source_id, media_type, slug, release_year, first_air_year FROM ${name} WHERE ${where} ORDER BY source_id LIMIT 5`);
    if (!sample.length) log('      (لا يوجد)');
    for (const r of sample) log(`      id=${r.id} | source_id=${r.source_id} | type=${r.media_type} | slug=${r.slug} | year=${r.release_year ?? r.first_air_year}`);
    if (cnt > 0) {
      log(`   ⚠ القائمة الكاملة (${cnt}):`);
      const all = await d1(`SELECT id, source_id, media_type, slug, release_year, first_air_year FROM ${name} WHERE ${where} ORDER BY media_type, source_id`);
      for (const r of all) log(`      id=${r.id} | source_id=${r.source_id} | type=${r.media_type} | slug=${r.slug} | year=${r.release_year ?? r.first_air_year}`);
    }
    summary.push({ name, total, orphan: cnt });
    log('');
  }

  // ─── ملخص ───
  log('════════════════ ملخص ════════════════');
  log(`الجدول${' '.repeat(26)}| إجمالي | أيتام`);
  for (const s of summary) {
    log(`${s.name.padEnd(31)}| ${String(s.total).padStart(5)} | ${String(s.orphan).padStart(6)}${s.orphan > 0 ? '  ⚠' : ''}`);
  }
  log('════════════════════════════════════════════════════════');
  log('قراءة فقط. لا حذف. في انتظار قرارك: تنظيف أم لا.');
  log('════════════════════════════════════════════════════════');

  const out = path.join(__dirname, '..', 'broken-link-audit-report', 'orphans-list-cache-audit.txt');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, L.join('\n') + '\n', 'utf8');
  console.log(`\n[التقرير محفوظ في] ${out}`);
})().catch(e => { console.error('خطأ:', e.message); process.exit(1); });