const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const outDir = path.join(__dirname, '../../data/backups/gap-apply-2026-09-11');
const accepted = JSON.parse(fs.readFileSync(path.join(outDir, 'accepted-7315.json'), 'utf8'));
console.log('accepted len=' + accepted.length);

const db = new Database(path.join(__dirname, '../../data/4cima-local.db'), { readonly: true });
db.pragma('busy_timeout = 30000');
const chunk = (a, s) => { const o = []; for (let i = 0; i < a.length; i += s) o.push(a.slice(i, i + s)); return o; };
const pq = (a) => a.map(() => '?').join(',');

// 2) القاعدة بدون genres (حسب امر المهمة): (title_ar OR title_en) AND vote_average>=5
let matched = [];
let excluded = [];
for (const c of chunk(accepted, 500)) {
  const rows = db.prepare(
    `SELECT tmdb_id, title_ar, title_en, vote_average, is_complete, is_filtered, filter_status, release_year FROM movies WHERE tmdb_id IN (${pq(c)})`
  ).all(...c);
  const byId = new Map(rows.map(r => [Number(r.tmdb_id), r]));
  for (const id of c) {
    const r = byId.get(Number(id));
    if (!r) { excluded.push({ id, reason: 'MISSING-local' }); continue; }
    const hasTitle = (r.title_ar != null && String(r.title_ar).trim() !== '') || (r.title_en != null && String(r.title_en).trim() !== '');
    const vaOk = r.vote_average != null && Number(r.vote_average) >= 5;
    if (hasTitle && vaOk) matched.push(Number(id));
    else excluded.push({ id, title_ar: r.title_ar, title_en: r.title_en, vote_average: r.vote_average, is_complete: r.is_complete });
  }
}
console.log('matched(title+va>=5) count=' + matched.length);
console.log('excluded count=' + excluded.length);
console.log('excluded detail=' + JSON.stringify(excluded, null, 2));

// 2ب) فحص !isSingleExcludedGenre للـmatched (للتأكيد ان القاعدة الكاملة تعطي نفس العدد)
const EX = new Set(['news','talk','documentary','reality']);
let singleExcluded = [];
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
    if (slugs.length === 1 && EX.has(slugs[0])) singleExcluded.push({ id, slug: slugs[0] });
  }
}
console.log('singleExcluded among matched=' + singleExcluded.length + ' ' + JSON.stringify(singleExcluded.slice(0,20)));
console.log('matched minus singleExcluded=' + (matched.length - singleExcluded.length));

// 3) الـ3 المستبعدة المتوقعة
for (const id of [78632, 1533564, 1688163]) {
  const r = db.prepare('SELECT tmdb_id, title_ar, title_en, vote_average, is_complete, is_filtered, filter_status, release_year FROM movies WHERE tmdb_id=?').get(id);
  console.log('excluded-check ' + id + ' => ' + JSON.stringify(r));
  console.log('  in accepted? ' + accepted.includes(id));
}

// LOCAL_VISITABLE قبل
const lv = db.prepare('SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000').get().c;
console.log('LOCAL_VISITABLE before=' + lv);
db.close();

// حفظ قائمة 7312 للخطوة ب
fs.writeFileSync(path.join(outDir, 'matched-7312.json'), JSON.stringify(matched.sort((a,b)=>a-b)), 'utf8');
console.log('wrote matched-7312.json len=' + matched.length);
console.log('READONLY-A DONE');
