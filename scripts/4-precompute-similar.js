#!/usr/bin/env node
/**
 * scripts/4-precompute-similar.js
 *
 * Precompute "similar" recommendations for all movies and series.
 * Writes to D1 via HTTP API (not local file).
 *
 * ─── خوارزمية الترتيب (محدّثة) ───
 * قديماً: overlap تنازلياً فقط، وكسر التعادل الضمني كان بأصغر tmdb_id
 * (لأن الصفوف تُحمّل ORDER BY tmdb_id والـ sort مستقر) → اقتراحات قديمة/غير منطقية.
 * الآن: الترتيب حسب:
 *   1) overlap تنازلياً     (تشابه الأنواع أولاً)
 *   2) popularity تنازلياً  (كسر التعادل بالأكثر شهرة)
 *   3) tmdb_id تصاعدياً     (كسر التعادل النهائي للاستقرار)
 *
 * الأداء: فهرس مقلوب genre → عناصر (بدل O(N²)) + اختيار top-12 بخطية.
 *
 * Usage:
 *   node scripts/4-precompute-similar.js                          # كل الأعمال (كتابة إلى D1)
 *   node scripts/4-precompute-similar.js --type=movie             # أفلام فقط
 *   node scripts/4-precompute-similar.js --type=series            # مسلسلات فقط
 *   node scripts/4-precompute-similar.js --test --ids=17335,64    # مقارنة قديم/جديد بدون كتابة
 *   node scripts/4-precompute-similar.js --reset                  # تجاهل التقدم المحفوظ
 */

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_HTTP_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

// Read token from .env.local
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
const PROGRESS_FILE = path.join(__dirname, 'progress-similar.json');
let token = process.env.CLOUDFLARE_D1_TOKEN;

if (!token && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/CLOUDFLARE_D1_TOKEN=(.+)/);
  if (match) {
    token = match[1].trim();
  }
}

if (!token) {
  console.error('ERROR: CLOUDFLARE_D1_TOKEN not found');
  process.exit(1);
}

// ─── CLI ───
const args = process.argv.slice(2);
const getArg = (name) => {
  const a = args.find(x => x.startsWith(`--${name}`));
  return a ? a.split('=')[1] : null;
};
const TYPE = getArg('type') || 'all';
const TEST_MODE = args.includes('--test');
const RESET = args.includes('--reset');
const IDS_ARG = getArg('ids');
const TEST_IDS = IDS_ARG ? IDS_ARG.split(',').map(Number).filter(Boolean) : null;
const TOP_K = 12;
const INSERT_BATCH = 50;    // صفوف لكل طلب كتابة إلى D1 (حد D1: 100 معامل → 50×2)

async function executeD1(sql, params = [], retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(D1_HTTP_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!res.ok && (res.status === 429 || res.status >= 500) && attempt < retries) {
      await new Promise(r => setTimeout(r, attempt * 2000));
      continue;
    }

    const data = await res.json().catch(() => null);
    if (!data) throw new Error(`D1 HTTP ${res.status}: (unreadable)`);
    if (!data.success) {
      const msg = (data.errors ?? []).map(e => `[${e.code}] ${e.message}`).join(', ');
      throw new Error(`D1 query failed: ${msg}`);
    }
    return data.result?.[0]?.results ?? [];
  }
}

// Helper: parse genres_json
function parseGenres(genresJson) {
  if (!genresJson) return [];
  try {
    const parsed = typeof genresJson === 'string' ? JSON.parse(genresJson) : genresJson;
    return Array.isArray(parsed) ? parsed.map(g => g.id || g.tmdb_id || g.slug).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// Create tables if not exist
async function ensureTables() {
  console.log('Ensuring cache tables exist...');

  await executeD1(`
    CREATE TABLE IF NOT EXISTS movie_similar_cache (
      tmdb_id INTEGER PRIMARY KEY,
      recommended_ids TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await executeD1(`
    CREATE TABLE IF NOT EXISTS series_similar_cache (
      tmdb_id INTEGER PRIMARY KEY,
      recommended_ids TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  console.log('Tables OK');
}

// ─── التقدم (progress-similar.json) ───
function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch { return { moviesIndex: 0, seriesIndex: 0 }; }
}
function saveProgress(progress) {
  progress.updatedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ─── مُقارِن الترتيب الجديد: overlap ↓ ثم popularity ↓ ثم tmdb_id ↑ ───
function isBetter(ovA, popA, idA, ovB, popB, idB) {
  if (ovA !== ovB) return ovA > ovB;
  if (popA !== popB) return popA > popB;
  return idA < idB;
}

// ─── بناء سياق الحساب: فهرس مقلوب genre → عناصر ───
function makeContext(items) {
  const postings = new Map();
  for (let i = 0; i < items.length; i++) {
    for (const g of items[i].genres) {
      let list = postings.get(g);
      if (!list) { list = []; postings.set(g, list); }
      list.push(i);
    }
  }
  return {
    postings,
    counters: new Int32Array(items.length),
    touched: new Int32Array(items.length),
    items,
  };
}

// ─── حساب top-K لصف واحد عبر الفهرس المقلوب (بدون sort على كل المرشحين) ───
function computeTopK(itemIdx, ctx) {
  const { postings, counters, touched, items } = ctx;
  const me = items[itemIdx];
  let tc = 0;

  // عدّ overlap لكل مرشح عبر قوائم الأنواع فقط
  for (let gi = 0; gi < me.genres.length; gi++) {
    const list = postings.get(me.genres[gi]);
    if (!list) continue;
    for (let k = 0; k < list.length; k++) {
      const j = list[k];
      if (j === itemIdx) continue;
      if (counters[j] === 0) touched[tc++] = j;
      counters[j]++;
    }
  }

  // اختيار top-K مع المقارن الثلاثي (بدون ترتيب كامل)
  const top = []; // الأفضل أولاً
  for (let t = 0; t < tc; t++) {
    const j = touched[t];
    const ov = counters[j];
    counters[j] = 0;
    if (ov === 0) continue;
    if (top.length === TOP_K && !isBetter(ov, items[j].popularity, items[j].tmdb_id,
      top[TOP_K - 1].overlap, top[TOP_K - 1].popularity, top[TOP_K - 1].tmdb_id)) {
      continue;
    }
    // إدراج في الموضع الصحيح (top.length <= 12 → رخيص)
    const cand = { tmdb_id: items[j].tmdb_id, overlap: ov, popularity: items[j].popularity };
    let pos = top.length;
    while (pos > 0 && isBetter(cand.overlap, cand.popularity, cand.tmdb_id,
      top[pos - 1].overlap, top[pos - 1].popularity, top[pos - 1].tmdb_id)) {
      pos--;
    }
    if (pos < TOP_K) top.splice(pos, 0, cand);
    if (top.length > TOP_K) top.pop();
  }
  return top;
}

// ─── معالجة نوع (أفلام أو مسلسلات) ───
async function processType(kind) {
  const isMovie = kind === 'movie';
  const table = isMovie ? 'movies' : 'tv_series';
  const cacheTable = isMovie ? 'movie_similar_cache' : 'series_similar_cache';
  const yearCol = isMovie ? 'release_year' : 'first_air_year';
  const progressKey = isMovie ? 'moviesIndex' : 'seriesIndex';
  const label = isMovie ? 'Movies' : 'Series';

  console.log(`\nProcessing ${label}...`);

  const existing = await executeD1(`SELECT COUNT(*) as c FROM ${cacheTable}`);
  console.log(`Existing ${label.toLowerCase()} cache: ${existing[0]?.c || 0} rows`);

  // الفلاتر: filter_status + poster_path + genres_json + (movies: vote_count>=50) + سنة >= 2000
  // يجلب popularity الآن لترجيح النتائج
  const rows = await executeD1(`
    SELECT tmdb_id, genres_json, popularity
    FROM ${table}
    WHERE (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
      AND poster_path IS NOT NULL
      AND genres_json IS NOT NULL
      AND ${yearCol} IS NOT NULL AND ${yearCol} >= 2000
      ${isMovie ? 'AND vote_count >= 50' : ''}
    ORDER BY tmdb_id
  `);

  console.log(`Loaded ${rows.length} ${label.toLowerCase()}`);
  if (rows.length === 0) return 0;

  const items = rows
    .map(r => ({ tmdb_id: r.tmdb_id, popularity: r.popularity || 0, genres: parseGenres(r.genres_json) }))
    .filter(r => r.genres.length > 0);
  console.log(`${label} with genres: ${items.length}`);

  const ctx = makeContext(items);
  const idToIdx = new Map(items.map((it, i) => [it.tmdb_id, i]));

  // تحديد الصفوف المطلوب معالجتها (استئناف من التقدم، أو وضع الاختبار)
  const progress = loadProgress();
  let startIdx = TEST_MODE || RESET ? 0 : (progress[progressKey] || 0);
  if (startIdx > items.length) startIdx = 0; // القاعدة تغيّرت — إعادة من البداية
  let targets;
  if (TEST_IDS) {
    targets = TEST_IDS.filter(id => idToIdx.has(id)).map(id => idToIdx.get(id));
    console.log(`Test mode: ${targets.length}/${TEST_IDS.length} ids found in pool`);
  } else {
    targets = Array.from({ length: items.length - startIdx }, (_, k) => startIdx + k);
    if (startIdx > 0) console.log(`Resuming from index ${startIdx} (${targets.length} remaining)`);
  }
  if (targets.length === 0) { console.log(`Nothing to process for ${label}`); return 0; }

  // وضع الاختبار: جلب القيم القديمة للمقارنة (بدون كتابة)
  let oldCache = new Map();
  if (TEST_MODE) {
    const testIds = targets.map(i => items[i].tmdb_id);
    const oldRows = await executeD1(
      `SELECT tmdb_id, recommended_ids FROM ${cacheTable} WHERE tmdb_id IN (${testIds.map(() => '?').join(',')})`,
      testIds
    );
    oldCache = new Map(oldRows.map(r => [r.tmdb_id, JSON.parse(r.recommended_ids)]));
  }

  let processed = 0;
  let values = [];
  const startTime = Date.now();

  for (const idx of targets) {
    const item = items[idx];
    const top = computeTopK(idx, ctx);
    const similar = top.map(t => t.tmdb_id);

    if (TEST_MODE) {
      const old = oldCache.get(item.tmdb_id) || [];
      console.log(`\n#${item.tmdb_id} (popularity=${item.popularity})`);
      console.log(`  old (${old.length}): [${old.join(', ')}]`);
      console.log(`  new (${similar.length}): ${top.map(t => `${t.tmdb_id}(ov=${t.overlap},pop=${t.popularity})`).join(', ')}`);
    } else if (similar.length > 0) {
      values.push([item.tmdb_id, JSON.stringify(similar)]);
    }

    processed++;

    // كتابة كل INSERT_BATCH صف (غير مفعّلة في وضع الاختبار)
    if (!TEST_MODE && values.length >= INSERT_BATCH) {
      const placeholders = values.map(() => '(?, ?)').join(',');
      const flatValues = values.flat();
      await executeD1(
        `INSERT OR REPLACE INTO ${cacheTable} (tmdb_id, recommended_ids) VALUES ${placeholders}`,
        flatValues
      );
      values = [];
      progress[progressKey] = idx + 1;
      saveProgress(progress);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`${label}: ${processed}/${targets.length} (${elapsed}s)`);
    }
  }

  // كتابة المتبقي
  if (!TEST_MODE && values.length > 0) {
    const placeholders = values.map(() => '(?, ?)').join(',');
    const flatValues = values.flat();
    await executeD1(
      `INSERT OR REPLACE INTO ${cacheTable} (tmdb_id, recommended_ids) VALUES ${placeholders}`,
      flatValues
    );
    progress[progressKey] = targets[targets.length - 1] + 1;
    saveProgress(progress);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`${label}: done — ${processed} processed (${elapsed}s)${TEST_MODE ? ' [TEST MODE — لم تُكتب أي بيانات]' : ''}`);
  return processed;
}

// Main
(async () => {
  try {
    if (TEST_MODE) console.log('🧪 TEST MODE — مقارنة فقط، لا كتابة إلى D1');
    await ensureTables();

    let total = 0;
    if (TYPE === 'all' || TYPE === 'movie') total += await processType('movie');
    if (TYPE === 'all' || TYPE === 'series') total += await processType('series');

    console.log(`\nTOTAL_PROCESSED=${total}`);

    if (!TEST_MODE && total === 0) {
      console.log('\nSTOP: No items cached');
      process.exit(0);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
