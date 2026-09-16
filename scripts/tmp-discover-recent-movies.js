/**
 * سحب ذكي عبر TMDB Discover — أفلام 2024-2026 الصادرة فعلاً
 * - GET /3/discover/movie?primary_release_date.gte=2024-01-01&lte=2026-12-31&with_release_type=2|3&sort_by=popularity.desc
 * - حتى 50 صفحة، فلترة محلية، INSERT OR IGNORE في movies (محلي فقط — ممنوع D1)
 * - لا يقرأ أي .env يدوياً (dotenv فقط)، ولا commit/push/deploy
 */
require('dotenv').config({ path: '.env.local' });
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const KEYS = [process.env.TMDB_API_KEY, process.env.TMDB_API_KEY_2, process.env.TMDB_API_KEY_BACKUP].filter(Boolean);
if (KEYS.length === 0) { console.error('❌ لا يوجد TMDB_API_KEY في البيئة'); process.exit(2); }
let keyIndex = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TODAY = new Date().toISOString().slice(0, 10); // 2026-09-12

async function discoverPage(page) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = new URL('https://api.themoviedb.org/3/discover/movie');
    url.searchParams.set('api_key', KEYS[keyIndex]);
    url.searchParams.set('language', 'en-US');
    url.searchParams.set('primary_release_date.gte', '2024-01-01');
    url.searchParams.set('primary_release_date.lte', '2026-12-31');
    url.searchParams.set('with_release_type', '2|3');
    url.searchParams.set('sort_by', 'popularity.desc');
    url.searchParams.set('page', String(page));
    let res;
    try {
      res = await fetch(url.toString());
    } catch (e) {
      await sleep(Math.min(1000 * 2 ** attempt, 15000));
      continue;
    }
    if (res.status === 429) {
      const ra = parseInt(res.headers.get('retry-after') || '2', 10);
      await sleep(Math.max(ra, 2) * 1000);
      if (KEYS.length > 1) keyIndex = (keyIndex + 1) % KEYS.length;
      continue;
    }
    if (res.status >= 500) { await sleep(Math.min(1000 * 2 ** attempt, 15000)); continue; }
    if (!res.ok) { console.error(`❌ صفحة ${page}: HTTP ${res.status}`); return null; }
    try { return await res.json(); } catch { return null; }
  }
  console.error(`❌ صفحة ${page}: فشل بعد محاولات`);
  return null;
}

(async () => {
  const dbPath = path.join(__dirname, '../data/4cima-local.db');
  const db = new Database(dbPath);
  db.pragma('busy_timeout = 30000');
  db.pragma('journal_mode = WAL');

  const existing = new Set(db.prepare('SELECT tmdb_id FROM movies').all().map((r) => r.tmdb_id));
  console.log(`📦 محلي موجود: ${existing.size.toLocaleString()} | اليوم: ${TODAY}`);

  const MAX_PAGES = 50;
  let pagesProcessed = 0, totalDiscovered = 0;
  let skippedExisting = 0, skippedNoDate = 0, skippedFuture = 0, skippedNoRating = 0;
  const toInsert = [];
  const seen = new Set();
  const sampleNew = [];
  let totalPagesKnown = MAX_PAGES;

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > totalPagesKnown) break;
    const data = await discoverPage(page);
    if (!data) { await sleep(500); continue; }
    pagesProcessed++;
    if (data.total_pages) totalPagesKnown = Math.min(data.total_pages, MAX_PAGES);
    const results = data.results || [];
    totalDiscovered += results.length;

    for (const m of results) {
      const id = m.id;
      if (seen.has(id)) { skippedExisting++; continue; }
      seen.add(id);
      if (existing.has(id)) { skippedExisting++; continue; }
      const rd = m.release_date || null;
      if (!rd) { skippedNoDate++; continue; }
      if (rd > TODAY) { skippedFuture++; continue; } // غير صادر بعد (ضمن lte=2026-12-31)
      const va = m.vote_average;
      if (va === null || va === undefined || va === 0) { skippedNoRating++; continue; }
      toInsert.push(id);
      if (sampleNew.length < 10) sampleNew.push({ id, title: m.title, release_date: rd, vote_average: va });
    }
    console.log(`📄 صفحة ${page}/${totalPagesKnown}: تراكمي مكتشف=${totalDiscovered} مرشح=${toInsert.length}`);
    await sleep(260);
  }

  let addedNew = 0;
  if (toInsert.length > 0) {
    const stmt = db.prepare('INSERT OR IGNORE INTO movies (tmdb_id, is_fetched, is_complete) VALUES (?, 0, 0)');
    const tx = db.transaction((ids) => { for (const id of ids) { if (stmt.run(id).changes > 0) addedNew++; } });
    tx(toInsert);
  }

  // حفظ أثر محلي للتدقيق (اختياري، لا يمس D1)
  try {
    const dir = path.join(__dirname, '../data/backups/discover-2026-09-12');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'discover-new-ids.json'), JSON.stringify(toInsert), 'utf8');
  } catch (e) { console.warn('⚠️ تعذر حفظ نسخة IDs:', e.message); }

  const waiting = db.prepare('SELECT COUNT(*) c FROM movies WHERE is_fetched=0').get().c;
  db.close();

  console.log('\n==== الجزء أ: نتيجة التصدير ====');
  console.log(`الصفحات المُعالجة: ${pagesProcessed}`);
  console.log(`إجمالي الأفلام المُكتشفة: ${totalDiscovered}`);
  console.log(`تجاوزت (موجودة محلياً/مكررة): ${skippedExisting}`);
  console.log(`تجاوزت (بلا release_date): ${skippedNoDate}`);
  console.log(`تجاوزت (تاريخ مستقبلي > اليوم): ${skippedFuture}`);
  console.log(`تجاوزت (بلا تقييم vote=0/null): ${skippedNoRating}`);
  console.log(`أُضيفت جديدة (is_fetched=0,is_complete=0): ${addedNew}`);
  console.log(`إجمالي الانتظار المحلي الآن (is_fetched=0): ${waiting}`);
  console.log('عيّنة 10 جديدة: ' + JSON.stringify(sampleNew));
  console.log('DONE-DISCOVER');
})().catch((e) => { console.error('❌ خطأ فادح:', e); process.exit(1); });
