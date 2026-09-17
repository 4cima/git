#!/usr/bin/env node
/**
 * scripts/build-sitemap-urls.js — يبني جدول sitemap_urls الذي يقرأ منه مسارا السايت ماب.
 *
 * لماذا: مسارات السايت ماب (قبل هذا الجدول) تمسح movies/tv_series بالكامل
 * لكل شظية ولكل قائمة أولوية — قياس الإنتاج (phase2.1-sitemap-before):
 *   /sitemap-index.xml → 345,153 صفًا مقروءًا
 *   /sitemap/movies-N  → 332,090 صفًا  |  /sitemap/priority.xml → 332,090
 *   /sitemap/series-N  → 100,236 صفًا  |  /sitemap/priority.xml → 100,236
 * بعد الجدول تصبح القراءة بحثًا نطاقيًا على فهرس بحد أعلى ثابت:
 *   shard    → ~20,000 صفًا مقروءًا (10,000 مدخل فهرس + 10,000 وصول للجدول)
 *   priority → ~2,000 صفًا  (1,000 مدخل فهرس + 1,000 وصول للجدول)
 *   counts   → ~2 صفًا (MAX على الفهرس — بلا COUNT(*) ولا مسح)
 *
 * المخطط (المعتمد — نفس SQL في المرآة والإنتاج):
 *   sitemap_urls(media_type, ordinal, shard, seq, slug, updated_at)
 *     PRIMARY KEY (media_type, ordinal)
 *     ordinal = ترتيب عام 1-based داخل النوع (ترتيب tmdb_id ASC)
 *     shard   = (ordinal-1)/10000
 *     seq     = ((ordinal-1)%10000)+1   (ترتيب داخل الشظية)
 *   idx_sitemap_shard   (media_type, shard, seq)       — مسار الشظية: بحث نطاقي مرتّب بـ seq
 *   idx_sitemap_updated (media_type, updated_at DESC)  — مسار الأولوية: بلا فرز مؤقت
 *   ملاحظة: الفهرسان غير مغطّيين (slug/updated_at ليسا في idx_sitemap_shard) ⇒ كل صف
 *   يُقرأ فيه وصول للجدول. لو أُضيف slug وupdated_at إلى idx_sitemap_shard لانخفضت
 *   قراءات الشظية إلى 10,000 والأولوية إلى 1,000 (تغيير فهرسي فقط — بانتظار قرار إسلام).
 *
 * الاستخدام:
 *   node scripts/build-sitemap-urls.js --sqlite <path>            # معاينة على مرآة محلية
 *   node scripts/build-sitemap-urls.js --sqlite <path> --apply    # كتابة على المرآة المحلية
 *   node scripts/build-sitemap-urls.js --remote                   # معاينة على D1 (قراءة فقط)
 *   node scripts/build-sitemap-urls.js --remote --apply           # ⚠️ كتابة على D1 الإنتاج
 *   خيارات: --no-parity (تخطّي فحص مطابقة الثوابت مع src/lib/sitemap.ts)
 *
 * أمان: لا يكتب أي شيء بدون --apply. على الإنتاج: لا يُشغَّل إلا بعد موافقة إسلام.
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const fs = require('fs');
const path = require('path');

/* ── ثوابت يجب أن تطابق src/lib/sitemap.ts (فحصها --parity) ───────────────── */
const SHARD_SIZE = 10000;
const PRIORITY_PER_TYPE = 1000;

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_QUERY_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const D1_RAW_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/raw`;

/* ── تعريف مجموعة روابط التفاصيل (B) — نسخة مطابقة لـ src/lib/sitemap.ts ──── */
const EXCLUDED_GENRE_IDS = [10767, 10768, 99, 36]; // Talk Show / War & Politics / Documentary / History
const CLEAN_ITEM_SQL =
  "filter_status = 'clean' AND slug IS NOT NULL AND slug != '' AND tmdb_id IS NOT NULL";

const TYPES = [
  { mediaType: 'movie', table: 'movies', yearColumn: 'release_year' },
  { mediaType: 'series', table: 'tv_series', yearColumn: 'first_air_year' },
];

function detailFilterSql(table, yearColumn) {
  return (
    `(genres_json IS NULL OR NOT EXISTS (SELECT 1 FROM json_each(${table}.genres_json) ` +
    `WHERE json_extract(value, '$.tmdb_id') IN (${EXCLUDED_GENRE_IDS.join(', ')}))) ` +
    `AND (${yearColumn} >= 2015 OR vote_count >= 1000)`
  );
}

/* ── فلتر الجودة على مستوى slug (المرحلة 2.4) — أي محتوى جديد بـslug فاشل ────
   لا يُدرج في sitemap_urls. النفي المزدوج لنفس قواعد scripts/rebuild-sitemap-quality.js:
   slug موجود، غير فارغ، > 1 حرف، لا يبدأ/ينتهي بـ'-'، لا يحتوي '--'، ليس رقمًا فقط. */
const SLUG_QUALITY_WHERE =
  `slug IS NOT NULL AND slug != '' AND LENGTH(slug) > 1 ` +
  `AND slug NOT LIKE '-%' AND slug NOT LIKE '%-' AND slug NOT LIKE '%--%' ` +
  `AND slug GLOB '*[^0-9]*'`;

/* ── DDL (نفس SQL المعتمد: ordinal + PK + فهرسان غير مغطّيين) ─────────────── */
const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sitemap_urls (
     media_type TEXT    NOT NULL,   -- 'movie' | 'series'
     ordinal    INTEGER NOT NULL,   -- ترتيب عام 1-based داخل النوع (ترتيب tmdb_id ASC)
     shard      INTEGER NOT NULL,   -- رقم الشظية (0-based) = (ordinal-1)/10000
     seq        INTEGER NOT NULL,   -- الترتيب داخل الشظية = ((ordinal-1)%10000)+1
     slug       TEXT    NOT NULL,
     updated_at TEXT,
     PRIMARY KEY (media_type, ordinal)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sitemap_shard
     ON sitemap_urls(media_type, shard, seq)`,
  `CREATE INDEX IF NOT EXISTS idx_sitemap_updated
     ON sitemap_urls(media_type, updated_at DESC)`,
];

const INDEXES_TO_DROP = ['idx_sitemap_shard', 'idx_sitemap_updated'];

/* ── SQL البناء (جملة واحدة لكل نوع: مسح واحد + ROW_NUMBER) ──────────────── */
function insertSql({ mediaType, table, yearColumn }) {
  return (
    `INSERT INTO sitemap_urls (media_type, ordinal, shard, seq, slug, updated_at)\n` +
    `SELECT '${mediaType}', rn, (rn - 1) / ${SHARD_SIZE}, ((rn - 1) % ${SHARD_SIZE}) + 1, slug, updated_at FROM (\n` +
    `  SELECT ROW_NUMBER() OVER (ORDER BY tmdb_id ASC, id ASC) AS rn, slug, updated_at\n` +
    `  FROM ${table}\n` +
    `  WHERE ${CLEAN_ITEM_SQL} AND ${detailFilterSql(table, yearColumn)} AND ${SLUG_QUALITY_WHERE}\n` +
    `)`
  );
}

/* ── SQL القراءة الثلاثة (نفس ما تستعمله المسارات) ───────────────────────── */
const READ_SQL = {
  shard: (type, page) =>
    `SELECT slug, updated_at FROM sitemap_urls WHERE media_type = '${type}' AND shard = ${page} ORDER BY seq LIMIT ${SHARD_SIZE}`,
  priority: (type) =>
    `SELECT slug, updated_at FROM sitemap_urls WHERE media_type = '${type}' ORDER BY updated_at DESC LIMIT ${PRIORITY_PER_TYPE}`,
  counts:
    `SELECT (SELECT MAX(shard) + 1 FROM sitemap_urls WHERE media_type = 'movie')  AS movie_shards,\n` +
    `       (SELECT MAX(shard) + 1 FROM sitemap_urls WHERE media_type = 'series') AS series_shards`,
};
/* ── الواجهتان: مرآة SQLite محلية / D1 عبر HTTP ───────────────────────────── */
function sqliteBackend(file) {
  const Database = require('better-sqlite3');
  const db = new Database(file); // محلي فقط: البناء يكتب جدول sitemap_urls
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  return {
    kind: `SQLite محلي: ${file}`,
    all: async (sql, params = []) => db.prepare(sql).all(...params),
    run: async (sql, params = []) => {
      const r = db.prepare(sql).run(...params);
      return { rows_written: r.changes, rows_read: null };
    },
    execMany: async (statements) => {
      for (const s of statements) db.exec(s);
    },
    dropIndexes: async () => {
      for (const n of INDEXES_TO_DROP) db.exec(`DROP INDEX IF EXISTS ${n}`);
    },
    explain: async (sql) => db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all().map((r) => r.detail),
    close: async () => db.close(),
  };
}

function remoteBackend() {
  const token = (process.env.CLOUDFLARE_D1_TOKEN || '').trim();
  if (!token) throw new Error('CLOUDFLARE_D1_TOKEN غير موجود في .env.local');

  const call = async (url, sql, params) => {
    const body = params && params.length ? { sql, params } : { sql };
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000),
    });
    const j = await res.json().catch(() => null);
    if (!j) throw new Error(`HTTP ${res.status} — استجابة غير قابلة للقراءة`);
    if (!j.success) throw new Error(`D1: ${JSON.stringify(j.errors)}`);
    return j.result || [];
  };

  return {
    kind: `D1 عبر HTTP API (${DATABASE_ID})`,
    all: async (sql, params = []) => (await call(D1_QUERY_URL, sql, params))[0]?.results ?? [],
    run: async (sql, params = []) => {
      const r = (await call(D1_RAW_URL, sql, params))[0];
      return { rows_written: r?.meta?.rows_written ?? null, rows_read: r?.meta?.rows_read ?? null };
    },
    execMany: async (statements) => {
      for (const s of statements) await call(D1_RAW_URL, s, []);
    },
    dropIndexes: async () => {
      for (const n of INDEXES_TO_DROP) await call(D1_RAW_URL, `DROP INDEX IF EXISTS ${n}`, []);
    },
    explain: async (sql) =>
      (await call(D1_QUERY_URL, `EXPLAIN QUERY PLAN ${sql}`))[0]?.results?.map((r) => r.detail) ?? [],
    close: async () => {},
  };
}

/* ── فحص المطابقة مع المصدر (يمنع انحراف الفلتر/الأحجام) ──────────────────── */
function checkParity() {
  const root = path.join(__dirname, '..');
  const libSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'sitemap.ts'), 'utf8');
  const genreSrc = fs.readFileSync(path.join(root, 'src', 'utils', 'excludedGenres.ts'), 'utf8');

  const checks = [
    [`export const SHARD_SIZE = ${SHARD_SIZE}`, 'SHARD_SIZE', libSrc],
    [`export const PRIORITY_PER_TYPE = ${PRIORITY_PER_TYPE}`, 'PRIORITY_PER_TYPE', libSrc],
    [CLEAN_ITEM_SQL, 'CLEAN_ITEM_SQL', libSrc],
    ['export const SITEMAP_MIN_YEAR = 2015', 'SITEMAP_MIN_YEAR = 2015', libSrc],
    ['export const SITEMAP_MIN_VOTE_COUNT = 1000', 'SITEMAP_MIN_VOTE_COUNT = 1000', libSrc],
    ['genres_json IS NULL OR NOT EXISTS (SELECT 1 FROM json_each(', 'sitemapDetailFilterSql()', libSrc],
  ];
  const bad = [];
  for (const [needle, label, hay] of checks) {
    const ok = hay.includes(needle);
    console.log(`   ${ok ? '✓' : '✗'} ${label}`);
    if (!ok) bad.push(label);
  }
  for (const id of EXCLUDED_GENRE_IDS) {
    const ok = new RegExp(`\\b${id}\\b`).test(genreSrc);
    console.log(`   ${ok ? '✓' : '✗'} genre ممنوع ${id}`);
    if (!ok) bad.push(`excluded genre ${id}`);
  }
  if (bad.length) throw new Error(`انحراف عن المصدر: ${bad.join(', ')}`);
}

/* ── التنفيذ ─────────────────────────────────────────────────────────────── */
const USAGE = `الاستخدام:
  node scripts/build-sitemap-urls.js --sqlite <path> [--apply] [--verify-vs-legacy]
  node scripts/build-sitemap-urls.js --remote [--apply]
  (بدون --apply = معاينة فقط، صفر كتابة)`;

function valueOf(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

const legacyFilter = (t) => `${CLEAN_ITEM_SQL} AND ${detailFilterSql(t.table, t.yearColumn)}`;

async function inventory(db) {
  const out = {};
  for (const t of TYPES) {
    const rows = await db.all(`SELECT COUNT(*) AS n FROM ${t.table} WHERE ${legacyFilter(t)}`);
    const n = Number(rows[0]?.n ?? 0);
    out[t.mediaType] = n;
    console.log(
      `   ${t.mediaType.padEnd(7)} ${String(n).padStart(7)} صفًا → ${Math.ceil(n / SHARD_SIZE)} شظية`
    );
  }
  return out;
}

/** يقارن قائمتي روابط: مرتّبة (ordered=true) أو كمُجموعة — للتحقق من المطابقة مع القديم. */
function compare(label, legacy, built, ordered) {
  const a = ordered ? legacy : [...legacy].sort();
  const b = ordered ? built : [...built].sort();
  if (a.length !== b.length) {
    console.log(`   ✗ ${label}: العدد مختلف (قديم=${a.length} جديد=${b.length})`);
    return false;
  }
  const diff = a.findIndex((v, i) => v !== b[i]);
  if (diff >= 0) {
    console.log(`   ✗ ${label}: اختلاف عند الموضع ${diff} (قديم=${a[diff]} جديد=${b[diff]})`);
    return false;
  }
  console.log(`   ✓ ${label}: ${b.length} رابطًا مطابقًا${ordered ? '' : ' (كمجموعة)'}`);
  return true;
}


async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const remote = args.includes('--remote');
  const noParity = args.includes('--no-parity');
  const verifyLegacy = args.includes('--verify-vs-legacy');
  const sqliteFile = valueOf(args, '--sqlite');

  if (remote && sqliteFile) throw new Error('اختر --remote أو --sqlite (واحدًا فقط)');
  if (!remote && !sqliteFile) {
    console.log(USAGE);
    process.exit(1);
  }

  console.log('\n=== build-sitemap-urls ===');
  if (!noParity) {
    console.log('\n0) فحص المطابقة مع src/lib/sitemap.ts + src/utils/excludedGenres.ts:');
    checkParity();
  }

  const db = remote ? remoteBackend() : sqliteBackend(path.resolve(sqliteFile));
  console.log(`\nbackend: ${db.kind}`);
  console.log(`mode   : ${apply ? 'APPLY — كتابة' : 'DRY RUN — صفر كتابة'}`);

  console.log('\nجرد مجموعة B (قراءة فقط، نفس فلتر المسارات):');
  const inv = await inventory(db);
  const total = Object.values(inv).reduce((a, b) => a + b, 0);
  console.log(`   الإجمالي ${total} صفًا`);

  if (!apply) {
    console.log('\nDRY RUN — لم تُكتب أي بيانات. أضف --apply للتنفيذ.');
    await db.close();
    return;
  }

  console.log('\n1) DDL (جدول + فهرسان مطابقان للـSQL المعتمد):');
  await db.execMany(DDL_STATEMENTS);
  for (const s of DDL_STATEMENTS) console.log('   ✓ ' + s.split('\n')[0].trim());

  console.log('\n2) البناء:');
  for (const t of TYPES) {
    const del = await db.run(`DELETE FROM sitemap_urls WHERE media_type = '${t.mediaType}'`);
    const ins = await db.run(insertSql(t));
    console.log(
      `   ${t.mediaType.padEnd(7)} حُذف ${del.rows_written ?? '?'} · أُدرج ${ins.rows_written ?? '?'}` +
        (ins.rows_read != null ? ` · rows_read=${ins.rows_read}` : '')
    );
  }

  console.log('\n3) تحقق من المحتوى:');
  const grouped = await db.all(
    `SELECT media_type, COUNT(*) AS rows, MIN(shard) AS min_shard, MAX(shard) AS max_shard
       FROM sitemap_urls GROUP BY media_type ORDER BY media_type`
  );
  let rowsTotal = 0;
  for (const g of grouped) {
    rowsTotal += Number(g.rows);
    console.log(
      `   ${String(g.media_type).padEnd(7)} ${String(g.rows).padStart(7)} صفًا` +
        ` · shards ${g.min_shard}..${g.max_shard}`
    );
  }
  console.log(`   الإجمالي ${rowsTotal} صفًا (المتوقع ${total}) ${rowsTotal === total ? '✓' : '✗'}`);

  const badSeq = await db.all(
    `SELECT COUNT(*) AS bad FROM sitemap_urls
       WHERE shard != (ordinal - 1) / ${SHARD_SIZE}
          OR seq   != ((ordinal - 1) % ${SHARD_SIZE}) + 1
          OR shard < 0 OR seq < 1`
  );
  console.log(
    `   سلامة ordinal/shard/seq: صفوف خاطئة = ${badSeq[0]?.bad} ${Number(badSeq[0]?.bad) === 0 ? '✓' : '✗'}`
  );

  const countsRows = await db.all(READ_SQL.counts);
  console.log(
    `   MAX(shard)+1: movies=${Number(countsRows[0]?.movie_shards ?? 0)} series=${Number(countsRows[0]?.series_shards ?? 0)}`
  );

  console.log('\n4) خطط القراءة (نفس SQL المسارات):');
  const planTargets = [
    ['shard · movie 0', READ_SQL.shard('movie', 0)],
    ['shard · series 0', READ_SQL.shard('series', 0)],
    ['priority · movie', READ_SQL.priority('movie')],
    ['priority · series', READ_SQL.priority('series')],
    ['counts (index)', READ_SQL.counts],
  ];
  for (const [label, sql] of planTargets) {
    console.log(`\n   ── ${label}`);
    for (const line of await db.explain(sql)) console.log(`      ${line}`);
    const rows = await db.all(sql);
    console.log(`      → ${rows.length} صفًا مُنتَجًا`);
  }

  if (verifyLegacy) {
    console.log('\n5) مطابقة الروابط مع الاستعلام القديم:');
    let ok = true;
    for (const t of TYPES) {
      const oldShard = await db.all(
        `SELECT slug FROM ${t.table} WHERE ${legacyFilter(t)} ORDER BY tmdb_id ASC LIMIT ${SHARD_SIZE}`
      );
      const newShard = await db.all(READ_SQL.shard(t.mediaType, 0));
      ok =
        compare(`شظية 0 · ${t.mediaType}`, oldShard.map((r) => r.slug), newShard.map((r) => r.slug), true) &&
        ok;

      const oldPrio = await db.all(
        `SELECT slug FROM ${t.table} WHERE ${legacyFilter(t)} ORDER BY updated_at DESC LIMIT ${PRIORITY_PER_TYPE}`
      );
      const newPrio = await db.all(READ_SQL.priority(t.mediaType));
      ok =
        compare(`أولوية · ${t.mediaType}`, oldPrio.map((r) => r.slug), newPrio.map((r) => r.slug), false) &&
        ok;
    }
    console.log(ok ? '   النتيجة: مطابقة كاملة ✓' : '   النتيجة: يوجد اختلاف ✗');
  }

  console.log('\n6) عيّنة أولوية (أحدث 3):');
  for (const r of await db.all(
    `SELECT media_type, slug, updated_at FROM sitemap_urls ORDER BY updated_at DESC LIMIT 3`
  )) {
    console.log(`   ${r.media_type} · ${r.slug} · ${r.updated_at}`);
  }

  await db.close();
  console.log('\n✅ انتهى البناء.');
}

main().catch((e) => {
  console.error('\n❌', e.message);
  process.exit(1);
});

