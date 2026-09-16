#!/usr/bin/env node
// تحقق فقط (قراءة) بعد gap-apply: يقرأ القوائم من النسخة الاحتياطية — لا UPDATE ولا DELETE.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.local') });
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
if (!TOKEN) { console.error('Token missing'); process.exit(1); }
const D1_BATCH = 80;
async function d1(sql, params, attempt = 1) {
  const delays = [0, 3000, 8000, 15000];
  if (delays[attempt - 1]) await new Promise(r => setTimeout(r, delays[attempt - 1]));
  try {
    const res = await fetch(D1_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(params ? { sql, params } : { sql }) });
    if (!res.ok) { const t = await res.text().catch(() => ''); if ((res.status === 429 || t.includes('7429') || t.includes('timeout')) && attempt < 4) return d1(sql, params, attempt + 1); throw new Error(`D1 HTTP ${res.status}: ${t.slice(0, 200)}`); }
    const j = await res.json();
    if (!j.success) { const m = (j.errors ?? []).map(e => `[${e.code}] ${e.message}`).join(', '); if ((m.includes('7429') || m.includes('timeout')) && attempt < 4) return d1(sql, params, attempt + 1); throw new Error(`D1 fail: ${m}`); }
    return { rows: j.result?.[0]?.results ?? [], changes: j.result?.[0]?.meta?.changes ?? 0 };
  } catch (e) { if (attempt >= 4) throw e; return d1(sql, params, attempt + 1); }
}
const paramsOf = (arr) => ({ qs: arr.map(() => '?').join(','), arr });
function chunk(arr, size) { const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; }
const localPath = path.join(__dirname, '../../data/4cima-local.db');
const db = new Database(localPath, { readonly: true });
(async () => {
  const outDir = path.join(__dirname, '../../data/backups/gap-apply-2026-09-11');
  const accepted = JSON.parse(fs.readFileSync(path.join(outDir, 'accepted-7315.json'), 'utf8'));
  const rejected = JSON.parse(fs.readFileSync(path.join(outDir, 'rejected-950.json'), 'utf8'));
  console.log(`lists: accepted=${accepted.length} rejected=${rejected.length}`);
  // محلي: accepted clean؟
  let ok = 0;
  for (const c of chunk(accepted, 700)) {
    const { qs, arr } = paramsOf(c);
    ok += db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${qs}) AND is_filtered=0 AND filter_status='clean'`).get(...arr).c;
  }
  console.log(`local accepted clean=${ok} (must 7315)`);
  // محلي: 106646/245891/910571 clean + 1399 tv clean
  for (const id of [106646, 245891, 910571]) {
    const r = db.prepare(`SELECT is_filtered, filter_status FROM movies WHERE tmdb_id=?`).get(id);
    console.log(`local movies ${id}: ${r ? `is_filtered=${r.is_filtered} filter_status=${r.filter_status}` : 'MISSING'}`);
  }
  const t = db.prepare(`SELECT is_filtered, filter_status FROM tv_series WHERE tmdb_id=?`).get(1399);
  console.log(`local tv 1399: ${t ? `is_filtered=${t.is_filtered} filter_status=${t.filter_status}` : 'MISSING'}`);
  // D1: rejected اختفوا؟
  let still = 0;
  for (const c of chunk(rejected, D1_BATCH)) {
    const { qs } = paramsOf(c);
    const r = await d1(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${qs})`, c);
    still += Number(r.rows?.[0]?.c || 0);
  }
  console.log(`D1 rejected still present (must 0)=${still}`);
  // D1: accepted ما زالوا؟
  let acc = 0;
  for (const c of chunk(accepted, D1_BATCH)) {
    const { qs } = paramsOf(c);
    const r = await d1(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${qs})`, c);
    acc += Number(r.rows?.[0]?.c || 0);
  }
  console.log(`D1 accepted still present (must 7315)=${acc}`);
  // D1: المحميون على D1 (movies + tv 1399)
  for (const id of [106646, 245891, 910571]) {
    const r = await d1(`SELECT tmdb_id, filter_status FROM movies WHERE tmdb_id=?`, [id]);
    console.log(`D1 movies ${id}: ${r.rows[0] ? `filter_status=${r.rows[0].filter_status}` : 'MISSING-D1'}`);
  }
  const tv = await d1(`SELECT tmdb_id, filter_status FROM tv_series WHERE tmdb_id=?`, [1399]);
  console.log(`D1 tv 1399: ${tv.rows[0] ? `filter_status=${tv.rows[0].filter_status}` : 'MISSING-D1'}`);
  // D1: أيتام؟
  const VM = `SELECT tmdb_id FROM movies WHERE is_complete=1 AND release_year>=2000 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)`;
  let orph = 0;
  for (const tt of ['list_movies_genre', 'list_movies_newest', 'list_movies_popular', 'list_movies_top_rated']) {
    const r = await d1(`SELECT COUNT(*) c FROM ${tt} WHERE tmdb_id IS NULL OR tmdb_id NOT IN (${VM})`);
    const n = Number(r.rows?.[0]?.c || 0);
    console.log(`orphan ${tt}=${n}`);
    orph += n;
  }
  const r1 = await d1(`SELECT COUNT(*) c FROM movie_similar_cache WHERE tmdb_id IS NULL OR tmdb_id NOT IN (${VM})`);
  console.log(`orphan movie_similar_cache=${r1.rows?.[0]?.c}`);
  orph += Number(r1.rows?.[0]?.c || 0);
  const r2 = await d1(`SELECT COUNT(*) c FROM short_titles_lookup WHERE media_type='movie' AND (source_id IS NULL OR source_id NOT IN (${VM}))`);
  console.log(`orphan short_titles_lookup(movie)=${r2.rows?.[0]?.c}`);
  orph += Number(r2.rows?.[0]?.c || 0);
  console.log(`orphans total=${orph} (must 0)`);
  const mc = await d1(`SELECT COUNT(*) c FROM movies`);
  console.log(`COUNT movies D1 now=${mc.rows?.[0]?.c}`);
  db.close();
  console.log('[E] test-should-reject...');
  execSync('node scripts/test-should-reject.js', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
  console.log('VERIFY DONE');
})().catch(e => { console.error('FATAL:', e.message); try { db.close(); } catch {} process.exit(1); });
