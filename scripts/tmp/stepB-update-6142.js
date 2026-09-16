const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const outDir = path.join(__dirname, '../../data/backups/gap-apply-2026-09-11');
const matched = JSON.parse(fs.readFileSync(path.join(outDir, 'matched-7312.json'), 'utf8'));
console.log('matched-7312 len=' + matched.length);

const dbPath = path.join(__dirname, '../../data/4cima-local.db');
const db = new Database(dbPath);
db.pragma('busy_timeout = 30000');
db.pragma('journal_mode = WAL');
const chunk = (a, s) => { const o = []; for (let i = 0; i < a.length; i += s) o.push(a.slice(i, i + s)); return o; };
const pq = (a) => a.map(() => '?').join(',');

const EX = new Set(['news', 'talk', 'documentary', 'reality']);

// 1) اشتقاق القائمة الصارمة: matched ناقص single-excluded
const singleExcludedSet = new Set();
for (const c of chunk(matched, 500)) {
  const grows = db.prepare(
    `SELECT cg.content_tmdb_id AS id, g.slug AS slug FROM content_genres cg JOIN genres g ON g.tmdb_id=cg.genre_tmdb_id WHERE cg.content_type='movie' AND cg.content_tmdb_id IN (${pq(c)})`
  ).all(...c);
  const byId = new Map();
  for (const g of grows) {
    const k = Number(g.id);
    if (!byId.has(k)) byId.set(k, []);
    byId.get(k).push(g.slug);
  }
  for (const id of c) {
    const slugs = byId.get(Number(id)) || [];
    if (slugs.length === 1 && EX.has(slugs[0])) singleExcludedSet.add(Number(id));
  }
}
console.log('singleExcluded count=' + singleExcludedSet.size);
const finalList = matched.filter(id => !singleExcludedSet.has(Number(id))).sort((a, b) => a - b);
console.log('final (rule-strict) len=' + finalList.length);
if (finalList.length !== 6142) console.log('WARN: expected 6142 got ' + finalList.length);
fs.writeFileSync(path.join(outDir, 'final-6142-rule-strict.json'), JSON.stringify(finalList), 'utf8');
fs.writeFileSync(path.join(outDir, 'single-excluded-1170.json'), JSON.stringify([...singleExcludedSet].sort((a, b) => a - b)), 'utf8');
console.log('wrote final-6142-rule-strict.json + single-excluded-1170.json');

// 2) LOCAL_VISITABLE قبل
const lvBefore = db.prepare('SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000').get().c;
console.log('LOCAL_VISITABLE before=' + lvBefore);
fs.writeFileSync(path.join(outDir, 'local-visitable-before.txt'), String(lvBefore), 'utf8');

// 3) UPDATE في transaction واحد
console.log('starting UPDATE transaction for ' + finalList.length + ' rows...');
const upd = db.transaction((ids) => {
  for (const c of chunk(ids, 500)) {
    db.prepare(`UPDATE movies SET is_complete=1, updated_at=datetime('now') WHERE tmdb_id IN (${pq(c)})`).run(...c);
  }
});
upd(finalList);
console.log('UPDATE committed.');

// 4) تحقق: COUNT is_complete=1 داخل القائمة
let okCount = 0;
for (const c of chunk(finalList, 500)) {
  okCount += db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) AND is_complete=1`).get(...c).c;
}
console.log('verify final-list is_complete=1 => ' + okCount + ' (must ' + finalList.length + ')');

// 5) الـ3 المستبعدة (vote<5) لازم is_complete=0
for (const id of [78632, 1533564, 1688163]) {
  const r = db.prepare('SELECT tmdb_id, vote_average, is_complete FROM movies WHERE tmdb_id=?').get(id);
  console.log(`excluded-vote ${id} => ` + JSON.stringify(r) + (Number(r.is_complete) === 0 ? ' OK' : ' FAIL');
}

// 6) عينة single-excluded لازم تبقى 0 (اول 5) + عد شامل
let seStill1 = 0;
const seArr = [...singleExcludedSet];
for (const c of chunk(seArr, 500)) {
  seStill1 += db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) AND is_complete=1`).get(...c).c;
}
console.log(`single-excluded is_complete=1 => ${seStill1} (must 0)`);
for (const id of seArr.slice(0, 5)) {
  const r = db.prepare('SELECT tmdb_id, vote_average, is_complete FROM movies WHERE tmdb_id=?').get(id);
  console.log(`  sample single-excluded ${id} => ` + JSON.stringify(r));
}

// 7) LOCAL_VISITABLE بعد
const lvAfter = db.prepare('SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000').get().c;
console.log(`LOCAL_VISITABLE before=${lvBefore} after=${lvAfter} delta=${lvAfter - lvBefore} (expected delta=${finalList.length})`);
fs.writeFileSync(path.join(outDir, 'local-visitable-after.txt'), String(lvAfter), 'utf8');
fs.writeFileSync(path.join(outDir, 'update-6142-result.json'), JSON.stringify({ updated: finalList.length, verified: okCount, singleExcludedKept0: seArr.length - seStill1, lvBefore, lvAfter }, null, 2), 'utf8');

db.close();
console.log('STEP-B DONE');
