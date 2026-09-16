const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const outDir = path.join(__dirname, '../../data/backups/gap-apply-2026-09-11');
const matched = JSON.parse(fs.readFileSync(path.join(outDir, 'matched-7312.json'), 'utf8'));
console.log('matched len=' + matched.length);
const db = new Database(path.join(__dirname, '../../data/4cima-local.db'), { readonly: true });
db.pragma('busy_timeout = 30000');
const chunk = (a, s) => { const o = []; for (let i = 0; i < a.length; i += s) o.push(a.slice(i, i + s)); return o; };
const pq = (a) => a.map(() => '?').join(',');
// توزيع is_filtered / release_year / is_complete داخل matched
let filt1 = 0, yearLt2000 = 0, yearNull = 0, comp1 = 0, comp0 = 0;
for (const c of chunk(matched, 500)) {
  const rows = db.prepare(`SELECT tmdb_id, is_filtered, filter_status, release_year, is_complete FROM movies WHERE tmdb_id IN (${pq(c)})`).all(...c);
  for (const r of rows) {
    if (Number(r.is_filtered) === 1) filt1++;
    if (r.release_year == null) yearNull++;
    else if (Number(r.release_year) < 2000) yearLt2000++;
    if (Number(r.is_complete) === 1) comp1++; else comp0++;
  }
}
console.log(`matched: is_filtered=1 => ${filt1} | release_year<2000 => ${yearLt2000} | release_year NULL => ${yearNull} | is_complete 1=>${comp1} 0=>${comp0}`);
// كم من matched سيدخل LOCAL_VISITABLE فعليا (is_filtered=0 AND release_year>=2000)
let visitableAdd = 0;
for (const c of chunk(matched, 500)) {
  visitableAdd += db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) AND is_filtered=0 AND release_year>=2000`).get(...c).c;
}
console.log('visitable-add (is_filtered=0 AND year>=2000 among matched)=' + visitableAdd);
const lv = db.prepare('SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000').get().c;
console.log(`LOCAL_VISITABLE before=${lv} | expected after=${lv + visitableAdd}`);
// المحميون
for (const id of [106646, 1399, 245891, 910571]) {
  const m = db.prepare('SELECT tmdb_id, is_filtered, filter_status, filter_reason, is_complete FROM movies WHERE tmdb_id=?').get(id);
  if (m) { console.log(`movies ${id}: ` + JSON.stringify(m)); continue; }
  const t = db.prepare('SELECT tmdb_id, is_filtered, filter_status, is_complete FROM tv_series WHERE tmdb_id=?').get(id);
  console.log((t ? `tv ${id}: ` + JSON.stringify(t) : `${id}: MISSING both`));
}
db.close();
console.log('READONLY-A2 DONE');
