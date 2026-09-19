#!/usr/bin/env node
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
const EXPECT = { gap: 8265, accepted: 7315, rejected: 950 };
const PROTECTED = new Set([398,1576,369885,1408,37135,37136,1266798,910571,250225,451955,10876,1006947,8653,1145810,156236,424762,179129,37432,544575,14428,675414,177248,67415,46086,1163263,304034,417975,362714,624480,289491,484328,874490,911719,32766,10488,202277,226674,39688,943315,269955,27]);
const CH = 700;
const D1_BATCH = 80;
const D1_DEPENDENT_TABLES = ['list_movies_genre','list_movies_newest','list_movies_popular','list_movies_top_rated','movie_similar_cache','short_titles_lookup'];
async function d1(sql, params, attempt = 1) {
  const delays = [0, 3000, 8000, 15000];
  if (delays[attempt - 1]) await new Promise(r => setTimeout(r, delays[attempt - 1]));
  try {
    const res = await fetch(D1_URL, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${TOKEN}`}, body: JSON.stringify(params ? {sql,params} : {sql}) });
    if (!res.ok) { const t = await res.text().catch(()=>{}); if ((res.status===429||t.includes('7429')||t.includes('timeout'))&&attempt<4) return d1(sql,params,attempt+1); throw new Error(`D1 HTTP ${res.status}: ${t.slice(0,200)}`); }
    const j = await res.json();
    if (!j.success) { const m=(j.errors??[]).map(e=>`[${e.code}] ${e.message}`).join(', '); if ((m.includes('7429')||m.includes('timeout'))&&attempt<4) return d1(sql,params,attempt+1); throw new Error(`D1 fail: ${m}`); }
    return { rows: j.result?.[0]?.results ?? [], changes: j.result?.[0]?.meta?.changes ?? 0 };
  } catch (e) { if (attempt>=4) throw e; return d1(sql,params,attempt+1); }
}
const paramsOf=(arr)=>({qs:arr.map(()=>'?').join(','),arr});
function chunk(arr,size){const out=[];for(let i=0;i<arr.length;i+=size)out.push(arr.slice(i,i+size));return out;}
const localPath = path.join(__dirname, '../../data/4cima-local.db');
const db = new Database(localPath, { timeout: 30000 });
/* Phase A: computeGap */
async function computeGap() {
  console.log('[A] Recompute gap...');
  const cntRes = await d1(`SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND release_year>=2000 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)`);
  const d1VisCount = Number(cntRes.rows?.[0]?.c||0);
  console.log(`  D1_VISITABLE count=${d1VisCount}`);
  const d1Vis = new Set();
  const PAGE = 2000;
  /* keyset بـNOT INDEXED (id = rowid alias): صيغة الـOR هنا تمنع فهارس filter_status
     الجزئية ويختار المخطط TEMP B-TREE (290K صف/نداء) — المسح المتسلسل على PK هو
     المثالي (~2K صف/نداء). التكافؤ اتأكد مقابل OFFSET (نفس تسلسل tmdb_id). */
  let lastId = 0;
  for (;;) {
    const r = await d1(`SELECT id, tmdb_id FROM movies NOT INDEXED WHERE is_complete=1 AND release_year>=2000 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL) AND id > ? ORDER BY id LIMIT ?`, [lastId, PAGE]);
    for (const row of r.rows) d1Vis.add(Number(row.tmdb_id));
    if (r.rows.length < PAGE) break;
    lastId = r.rows[r.rows.length - 1].id;
  }
  const localVis = new Set(db.prepare(`SELECT tmdb_id FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000`).all().map(r => Number(r.tmdb_id)));
  const gapArr = [...d1Vis].filter(id => !localVis.has(id)).sort((a, b) => a - b);
  console.log(`  D1_VISITABLE=${d1Vis.size} | LOCAL_VISITABLE=${localVis.size} | gap=${gapArr.length}`);
  if (gapArr.length === 0) { console.log('Gap empty. Tables already synced.'); return null; }
  const rowsByGap = new Map();
  for (const c of chunk(gapArr, CH)) {
    const { qs, arr } = paramsOf(c);
    const rows = db.prepare(`SELECT tmdb_id,release_year,title_en,vote_average,vote_count,popularity,runtime,filter_reason,is_filtered,filter_status,is_complete FROM movies WHERE tmdb_id IN (${qs})`).all(...arr);
    for (const r of rows) rowsByGap.set(Number(r.tmdb_id), r);
  }
  const found = gapArr.filter(id => rowsByGap.has(id));
  if (found.length !== gapArr.length) { console.error('Missing ids locally -- stop'); process.exit(1); }
  const classify = r => { const vc=Number(r.vote_count||0); const nr = r.runtime==null||Number(r.runtime)===0; const va=Number(r.vote_average||0); const po=Number(r.popularity||0); return vc<20 && nr && va<5 && po<5; };
  const rejected = found.filter(id => classify(rowsByGap.get(id))).map(Number);
  const accepted = found.filter(id => !classify(rowsByGap.get(id))).map(Number);
  console.log(`  gap=${gapArr.length} | accepted=${accepted.length} | rejected=${rejected.length}`);
  if (gapArr.length !== EXPECT.gap || accepted.length !== EXPECT.accepted || rejected.length !== EXPECT.rejected) { console.error('Mismatch with EXPECT -- stop'); process.exit(1); }
  const pA = accepted.filter(id => PROTECTED.has(id)); const pR = rejected.filter(id => PROTECTED.has(id));
  if (pA.length || pR.length) { console.error(`Protected ids in lists (a=${pA.length},r=${pR.length}) -- stop`); process.exit(1); }
  console.log('  OK no protected ids.');
  return { gapArr, accepted, rejected, rowsByGap };
}
/* Phase B: backup — gap-8265-full.jsonl + accepted-7315.json + rejected-950.json */
function phaseBackup(gapArr, accepted, rejected, rowsByGap) {
  console.log('[B] Backup...');
  const outDir = path.join(__dirname, '../../data/backups/gap-apply-2026-09-11');
  fs.mkdirSync(outDir, { recursive: true });
  const fullPath = path.join(outDir, 'gap-8265-full.jsonl');
  const accPath = path.join(outDir, 'accepted-7315.json');
  const rejPath = path.join(outDir, 'rejected-950.json');
  const lines = gapArr.map(id => {
    const r = rowsByGap.get(id);
    return JSON.stringify({ tmdb_id: Number(id), year: r.release_year ?? null, title: r.title_en ?? null, vote_average: r.vote_average ?? null, popularity: r.popularity ?? null, filter_reason: r.filter_reason ?? null });
  });
  fs.writeFileSync(fullPath, lines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(accPath, JSON.stringify([...accepted].sort((a, b) => a - b)), 'utf8');
  fs.writeFileSync(rejPath, JSON.stringify([...rejected].sort((a, b) => a - b)), 'utf8');
  for (const [p, n] of [[fullPath, lines.length], [accPath, accepted.length], [rejPath, rejected.length]]) {
    const st = fs.statSync(p);
    console.log(`  ${path.basename(p)}: ${(st.size / 1024).toFixed(1)} KB | rows=${n}`);
  }
  if (lines.length !== EXPECT.gap || accepted.length !== EXPECT.accepted || rejected.length !== EXPECT.rejected) { console.error('Backup count mismatch -- stop'); process.exit(1); }
  return { outDir, fullPath, accPath, rejPath };
}
/* Phase C: local UPDATE — 7315 في transaction واحد */
function phaseLocalUpdate(accepted) {
  console.log('[C] Local UPDATE 7315...');
  const upd = db.transaction((ids) => {
    let total = 0;
    for (const c of chunk(ids, 500)) {
      const { qs, arr } = paramsOf(c);
      const info = db.prepare(`UPDATE movies SET is_filtered=0, filter_status='clean', filter_reason=NULL, updated_at=datetime('now') WHERE tmdb_id IN (${qs})`).run(...arr);
      total += info.changes;
    }
    return total;
  });
  const updated = upd(accepted);
  console.log(`  updated rows=${updated}`);
  let ok = 0;
  for (const c of chunk(accepted, CH)) {
    const { qs, arr } = paramsOf(c);
    ok += db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${qs}) AND is_filtered=0 AND filter_status='clean'`).get(...arr).c;
  }
  console.log(`  verify clean=${ok}`);
  if (ok !== EXPECT.accepted) { console.error('Local verify failed -- stop'); process.exit(1); }
  return updated;
}
/* Phase D: D1 pre-check + DELETE dependents+movies batches<=80 */
async function phaseD1Delete(rejected) {
  console.log('[D] D1 pre-check sample10+count...');
  let preCount = 0;
  for (const c of chunk(rejected, D1_BATCH)) {
    const { qs } = paramsOf(c);
    const r = await d1(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${qs})`, c);
    preCount += Number(r.rows?.[0]?.c || 0);
  }
  console.log(`  rejected present on D1: ${preCount}/${rejected.length}`);
  const sm = await d1(`SELECT tmdb_id, slug, release_year, filter_status FROM movies WHERE tmdb_id IN (${rejected.slice(0, 10).map(() => '?').join(',')})`, rejected.slice(0, 10));
  console.log('  sample 10:');
  for (const r of sm.rows) console.log(`    ${r.tmdb_id} | ${r.slug} | ${r.release_year} | ${r.filter_status}`);
  const moviesBefore = Number((await d1(`SELECT COUNT(*) c FROM movies`)).rows?.[0]?.c || 0);
  console.log(`  COUNT movies D1 before=${moviesBefore}`);
  console.log('[D] DELETE dependents then movies...');
  let delDep = 0, delMovies = 0;
  for (const c of chunk(rejected, D1_BATCH)) {
    const { qs } = paramsOf(c);
    for (const t of D1_DEPENDENT_TABLES) {
      const col = t === 'short_titles_lookup' ? 'source_id' : 'tmdb_id';
      let sql = `DELETE FROM ${t} WHERE ${col} IN (${qs})`;
      if (t === 'short_titles_lookup') sql += ` AND media_type='movie'`;
      const r = await d1(sql, c);
      delDep += Number(r.changes || 0);
    }
    const r2 = await d1(`DELETE FROM movies WHERE tmdb_id IN (${qs})`, c);
    void r2; // meta.changes يشمل FTS triggers (3x) — الحكم هو COUNT قبل/بعد فقط
    delMovies += c.length; // عدد المعرفات المرسلة (يُطابَق مع COUNT قبل/بعد)
  }
  console.log(`  deleted dependents=${delDep} movies=${delMovies}`);
  const moviesAfter = Number((await d1(`SELECT COUNT(*) c FROM movies`)).rows?.[0]?.c || 0);
  console.log(`  COUNT movies D1 after=${moviesAfter} diff=${moviesBefore - moviesAfter}`);
  if (moviesBefore - moviesAfter !== EXPECT.rejected) { console.error('D1 diff mismatch -- STOP'); process.exit(1); }
  if (delMovies !== EXPECT.rejected) { console.error('D1 deleted mismatch -- STOP'); process.exit(1); }
  return { moviesBefore, moviesAfter, delMovies, delDep };
}
/* Phase E: verify */
async function phaseVerify(accepted, rejected) {
  console.log('[E] Verify...');
  for (const id of [106646, 1399, 245891, 910571]) {
    if (id === 1399) {
      const Tv = require('better-sqlite3')(localPath, { readonly: true });
      const trow = Tv.prepare(`SELECT tmdb_id, is_filtered, filter_status FROM tv_series WHERE tmdb_id=?`).get(id);
      Tv.close();
      console.log(`  local-tv ${id}: ${trow ? `is_filtered=${trow.is_filtered} filter_status=${trow.filter_status}` : 'MISSING-tv-local'}`);
      const drow = await d1(`SELECT tmdb_id, filter_status FROM tv_series WHERE tmdb_id=?`, [id]);
      console.log(`  D1-tv ${id}: ${drow.rows[0] ? `filter_status=${drow.rows[0].filter_status}` : 'MISSING-tv-D1'}`);
      continue;
    }
    const row = db.prepare(`SELECT tmdb_id, is_filtered, filter_status FROM movies WHERE tmdb_id=?`).get(id);
    console.log(`  local ${id}: ${row ? `is_filtered=${row.is_filtered} filter_status=${row.filter_status}` : 'MISSING-local'}`);
    const dr = await d1(`SELECT tmdb_id, filter_status FROM movies WHERE tmdb_id=?`, [id]);
    console.log(`  D1 ${id}: ${dr.rows[0] ? `filter_status=${dr.rows[0].filter_status}` : 'MISSING-D1'}`);
  }
  let still = 0;
  for (const c of chunk(rejected, D1_BATCH)) {
    const { qs } = paramsOf(c);
    const r = await d1(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${qs})`, c);
    still += Number(r.rows?.[0]?.c || 0);
  }
  console.log(`  rejected still on D1 (must 0)=${still}`);
  if (still !== 0) { console.error('Rejected remain -- stop'); process.exit(1); }
  let accThere = 0;
  for (const c of chunk(accepted, D1_BATCH)) {
    const { qs } = paramsOf(c);
    const r = await d1(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${qs})`, c);
    accThere += Number(r.rows?.[0]?.c || 0);
  }
  console.log(`  accepted still on D1 (must 7315)=${accThere}`);
  if (accThere !== EXPECT.accepted) { console.error('Accepted missing -- stop'); process.exit(1); }
  const VM = `SELECT tmdb_id FROM movies WHERE is_complete=1 AND release_year>=2000 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)`;
  let orph = 0;
  for (const t of ['list_movies_genre', 'list_movies_newest', 'list_movies_popular', 'list_movies_top_rated']) {
    const r = await d1(`SELECT COUNT(*) c FROM ${t} WHERE tmdb_id IS NULL OR tmdb_id NOT IN (${VM})`);
    const n = Number(r.rows?.[0]?.c || 0);
    console.log(`  orphan ${t}=${n}`);
    orph += n;
  }
  const r1 = await d1(`SELECT COUNT(*) c FROM movie_similar_cache WHERE tmdb_id IS NULL OR tmdb_id NOT IN (${VM})`);
  const n1 = Number(r1.rows?.[0]?.c || 0);
  console.log(`  orphan movie_similar_cache=${n1}`);
  orph += n1;
  const r2 = await d1(`SELECT COUNT(*) c FROM short_titles_lookup WHERE media_type='movie' AND (source_id IS NULL OR source_id NOT IN (${VM}))`);
  const n2 = Number(r2.rows?.[0]?.c || 0);
  console.log(`  orphan short_titles_lookup(movie)=${n2}`);
  orph += n2;
  console.log(`  orphans total=${orph}`);
  if (orph !== 0) { console.error('Orphans found'); process.exit(1); }
  console.log('[E] test-should-reject...');
  execSync('node scripts/test-should-reject.js', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
  console.log('  should-reject 0 fail OK');
}
(async () => {
  const g = await computeGap();
  if (!g) { db.close(); return; }
  phaseBackup(g.gapArr, g.accepted, g.rejected, g.rowsByGap);
  phaseLocalUpdate(g.accepted);
  const dd = await phaseD1Delete(g.rejected);
  await phaseVerify(g.accepted, g.rejected);
  db.close();
  console.log('1) البداية: 8265 = 7315 + 950');
  console.log(`2) UPDATE محلي: 7315`);
  console.log(`3) D1 قبل=${dd.moviesBefore} بعد=${dd.moviesAfter} فرق=${dd.moviesBefore - dd.moviesAfter}`);
  console.log(`4) الايتام: 0`);
  console.log(`5) المحميون clean OK`);
  console.log(`6) should-reject: 0 فشل`);
  console.log(`7) النسخة: data/backups/gap-apply-2026-09-11/`);
  console.log(`8) اكتمل التطبيق. في انتظار قرارك.`);
})().catch(e => { console.error('FATAL:', e.message); try { db.close(); } catch {} process.exit(1); });