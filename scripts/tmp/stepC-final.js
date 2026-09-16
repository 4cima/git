const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../../data/4cima-local.db'), { readonly: true });
db.pragma('busy_timeout = 30000');
const lv = db.prepare('SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000').get().c;
console.log('LOCAL_VISITABLE final=' + lv);
for (const id of [106646, 245891, 910571]) {
  console.log('movies ' + id + ' => ' + JSON.stringify(db.prepare('SELECT tmdb_id, is_filtered, filter_status, filter_reason, is_complete FROM movies WHERE tmdb_id=?').get(id)));
}
console.log('tv 1399 => ' + JSON.stringify(db.prepare('SELECT tmdb_id, is_filtered, filter_status, is_complete FROM tv_series WHERE tmdb_id=?').get(1399)));
console.log('is_complete dist accepted-sample check:');
const fs = require('fs');
const outDir = path.join(__dirname, '../../data/backups/gap-apply-2026-09-11');
const fin = JSON.parse(fs.readFileSync(path.join(outDir, 'final-6142-rule-strict.json'), 'utf8'));
const se = JSON.parse(fs.readFileSync(path.join(outDir, 'single-excluded-1170.json'), 'utf8'));
const acc = JSON.parse(fs.readFileSync(path.join(outDir, 'accepted-7315.json'), 'utf8'));
const chunk = (a, s) => { const o = []; for (let i = 0; i < a.length; i += s) o.push(a.slice(i, i + s)); return o; };
const pq = (a) => a.map(() => '?').join(',');
let c1 = 0;
for (const c of chunk(acc, 500)) c1 += db.prepare("SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (" + pq(c) + ") AND is_complete=1").get(...c).c;
console.log('accepted-7315: is_complete=1 => ' + c1 + ' | is_complete=0 => ' + (acc.length - c1));
console.log('final-6142 len=' + fin.length + ' | single-excluded-1170 len=' + se.length + ' | 6142+1170+3=' + (fin.length + se.length + 3));
db.close();
console.log('STEP-C DONE');
