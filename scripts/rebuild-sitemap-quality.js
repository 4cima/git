#!/usr/bin/env node
/**
 * scripts/rebuild-sitemap-quality.js — فلتر الجودة على sitemap_urls (المرحلة 2).
 *
 * لماذا: مولّد slug قديم في سكربتات الـingestion أنتج slugs "قمامة" انزلقت إلى
 * sitemap_urls (تبدأ بـ- / تنتهي بـ- / حرف واحد / رقم فقط مثل سنة / شرطة مزدوجة).
 * هذه الروابط صفحات 404/ضعيفة في السايت ماب. الصفحات نفسها (movies/tv_series)
 * لا تُلمس — الجدول فهرس فقط، والحذف من sitemap_urls لا يكسر أي صفحة موجودة.
 *
 * فلتر الجودة (المطبّق — نفسه في scripts/build-sitemap-urls.js للمحتوى الجديد):
 *   - slug موجود وغير فارغ
 *   - LENGTH(slug) > 1        (يحذف الحرف الواحد و'-' وحده)
 *   - لا يبدأ بـ'-' ولا ينتهي بـ'-' ولا يحتوي '--'
 *   - ليس رقمًا فقط (يشمل slugs السنة "2010" — GLOB '*[^0-9]*')
 *
 * إعادة الترقيم (بعد الحذف، لكل media_type):
 *   ordinal = ROW_NUMBER() بترتيب ordinal القديم (يحافظ على ترتيب tmdb_id ASC الأصلي)
 *   shard   = (ordinal - 1) / 10000
 *   seq     = ((ordinal - 1) % 10000) + 1
 *
 * الخوارزمية بلا تضارب PK (media_type, ordinal): إزاحة كل ordinals النوع بمقدار
 * OFFSET كبير أولاً (تحريك موحّد = لا تصادم)، ثم كتابة الترقيم الجديد (1..N لا
 * يصطدم أبدًا مع القيم المزاحة ≥ OFFSET).
 *
 * الاستخدام:
 *   node scripts/rebuild-sitemap-quality.js --remote            # dry-run على D1 (قراءة فقط)
 *   node scripts/rebuild-sitemap-quality.js --remote --apply    # ⚠️ تنفيذ على D1 الإنتاج
 *   node scripts/rebuild-sitemap-quality.js --sqlite <path>     # مرآة محلية
 *   (dry-run = الوضع الافتراضي — صفر كتابة)
 *
 * أمان: لا يكتب أي شيء بدون --apply. على الإنتاج: لا يُشغَّل إلا بعد موافقة إسلام.
 * المتطلب: sitemap_urls_backup_20260917 موجود (المرحلة 0) — يُتحقق منه قبل --apply.
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const path = require('path');

/* ── ثوابت مطابقة لـ scripts/build-sitemap-urls.js و src/lib/sitemap.ts ───── */
const SHARD_SIZE = 10000;
const BACKUP_TABLE = 'sitemap_urls_backup_20260917';

/** الشرط "القمامة" — أي صف يحقّقه يُحذف (نفيه هو فلتر الجودة في build-sitemap-urls.js). */
const SLUG_QUALITY_BAD =
  `slug IS NULL OR slug = '' OR LENGTH(slug) <= 1` +
  ` OR slug LIKE '-%' OR slug LIKE '%-' OR slug LIKE '%--%'` +
  ` OR slug NOT GLOB '*[^0-9]*'`;

/** قواعد العرض (إحصاء مستقل لكل قاعدة — متداخلة بينها، والإجمالي هو UNIQUE). */
const RULES = [
  { label: 'slug يبدأ بـ "-"',     where: `slug LIKE '-%'` },
  { label: 'slug ينتهي بـ "-"',    where: `slug LIKE '%-'` },
  { label: 'slug = "-" فقط',       where: `slug = '-'` },
  { label: 'حرف واحد أو أقل (≤1)', where: `LENGTH(slug) <= 1` },
  { label: 'أرقام فقط (سنة/ID)',   where: `slug NOT GLOB '*[^0-9]*' AND slug != ''` },
  { label: 'شرطة مزدوجة "--"',     where: `slug LIKE '%--%'` },
];

/* إزاحة آمنة أكبر من أي MAX(ordinal) متوقع (الحد الحالي 62,509) */
const OFFSET = 10000000;

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_QUERY_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const D1_RAW_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/raw`;

/* ── الواجهتان: مرآة SQLite محلية / D1 عبر HTTP (نمط build-sitemap-urls.js) ── */
function sqliteBackend(file) {
  const Database = require('better-sqlite3');
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  return {
    kind: `SQLite محلي: ${file}`,
    all: async (sql) => db.prepare(sql).all(),
    run: async (sql) => {
      const r = db.prepare(sql).run();
      return { rows_written: r.changes };
    },
    close: async () => db.close(),
  };
}

function remoteBackend() {
  const token = (process.env.CLOUDFLARE_D1_TOKEN || '').trim();
  if (!token) throw new Error('CLOUDFLARE_D1_TOKEN غير موجود في .env.local');

  const call = async (url, sql) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
      signal: AbortSignal.timeout(300000),
    });
    const j = await res.json().catch(() => null);
    if (!j) throw new Error(`HTTP ${res.status} — استجابة غير قابلة للقراءة`);
    if (!j.success) throw new Error(`D1: ${JSON.stringify(j.errors)}`);
    return j.result || [];
  };

  return {
    kind: `D1 عبر HTTP API (${DATABASE_ID})`,
    all: async (sql) => (await call(D1_QUERY_URL, sql))[0]?.results ?? [],
    run: async (sql) => {
      const r = (await call(D1_RAW_URL, sql))[0];
      return { rows_written: r?.meta?.rows_written ?? null };
    },
    close: async () => {},
  };
}

/* ── التنفيذ ─────────────────────────────────────────────────────────────── */
const USAGE = `الاستخدام:
  node scripts/rebuild-sitemap-quality.js --remote            # dry-run (قراءة فقط)
  node scripts/rebuild-sitemap-quality.js --remote --apply    # ⚠️ تنفيذ
  node scripts/rebuild-sitemap-quality.js --sqlite <path> [--apply]`;

function valueOf(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const remote = args.includes('--remote');
  const sqliteFile = valueOf(args, '--sqlite');

  if (remote && sqliteFile) throw new Error('اختر --remote أو --sqlite (واحدًا فقط)');
  if (!remote && !sqliteFile) {
    console.log(USAGE);
    process.exit(1);
  }

  const db = remote ? remoteBackend() : sqliteBackend(path.resolve(sqliteFile));
  console.log('\n=== rebuild-sitemap-quality ===');
  console.log(`backend: ${db.kind}`);
  console.log(`mode   : ${apply ? 'APPLY — حذف وإعادة ترقيم' : 'DRY RUN — صفر كتابة'}`);

  /* 1) الجرد الحالي */
  const totals = await db.all(
    `SELECT media_type, COUNT(*) AS n, MAX(ordinal) AS max_ord, MAX(shard) AS max_shard
      FROM sitemap_urls GROUP BY media_type`
  );
  console.log('\n1) الجرد الحالي (sitemap_urls):');
  const grand = { total: 0, bad: 0 };
  for (const t of totals) {
    grand.total += Number(t.n);
    console.log(
      `   ${t.media_type.padEnd(7)} ${String(t.n).padStart(7)} صفًا · ` +
        `ordinal 1..${t.max_ord} · shards 0..${t.max_shard}`
    );
  }

  /* 2) إحصاء لكل قاعدة (مستقلة — متداخلة) + عيّنات */
  console.log('\n2) قواعد القمامة (إحصاء مستقل — القواعد متداخلة):');
  for (const rule of RULES) {
    const rows = await db.all(
      `SELECT media_type, COUNT(*) AS n FROM sitemap_urls WHERE ${rule.where} GROUP BY media_type`
    );
    const sum = rows.reduce((a, r) => a + Number(r.n), 0);
    const parts = rows.map((r) => `${r.media_type}:${r.n}`).join(' + ') || '0';
    console.log(`   ${rule.label.padEnd(24)} ${String(sum).padStart(4)}  (${parts})`);
    if (sum > 0) {
      const samples = await db.all(
        `SELECT slug FROM sitemap_urls WHERE ${rule.where} ORDER BY media_type, ordinal LIMIT 5`
      );
      console.log(`      عيّنات: ${samples.map((s) => JSON.stringify(s.slug)).join(', ')}`);
    }
  }

  /* 3) الإجمالي UNIQUE (الفعل المحذوف) + الصفوف الباقية */
  const unique = await db.all(
    `SELECT media_type,
            SUM(CASE WHEN (${SLUG_QUALITY_BAD}) THEN 1 ELSE 0 END) AS bad,
            COUNT(*) AS total
       FROM sitemap_urls GROUP BY media_type`
  );
  console.log('\n3) الحصيلة (فريد — المتغيّر فعليًا):');
  const plan = [];
  for (const u of unique) {
    const bad = Number(u.bad);
    const keep = Number(u.total) - bad;
    grand.bad += bad;
    const newMaxShard = keep > 0 ? Math.ceil(keep / SHARD_SIZE) - 1 : 0;
    plan.push({ mediaType: u.media_type, bad, keep, newMaxShard });
    console.log(
      `   ${u.media_type.padEnd(7)} يُحذف ${String(bad).padStart(4)} · ` +
        `يبقى ${String(keep).padStart(6)} من ${u.total} · ` +
        `shards تصبح 0..${newMaxShard}`
    );
  }
  const newTotal = grand.total - grand.bad;
  console.log(
    `\n   الإجمالي: ${grand.total} → ${newTotal} (يُحذف ${grand.bad}) — ` +
      `الفهرس سيُبني تلقائيًا من MAX(shard)+1`
  );

  if (!apply) {
    console.log('\nDRY RUN — لم تُكتب أي بيانات. أضف --apply للتنفيذ.');
    await db.close();
    return;
  }

  await applyPhase(db, grand, plan);
  await db.close();
}

/* ── APPLY: الحذف + إعادة الترقيم + فحص السلامة ───────────────────────────── */
async function applyPhase(db, grand, plan) {
  console.log('\n-- APPLY --');

  /* 0) تحقق من جدول الـbackup (المتطلب الأمني) */
  let backupOk = false;
  try {
    const b = await db.all(`SELECT COUNT(*) AS n FROM ${BACKUP_TABLE}`);
    backupOk = Number(b[0]?.n ?? 0) === grand.total;
    console.log(`   جدول الـbackup ${BACKUP_TABLE}: ${b[0]?.n} صفًا ${backupOk ? '✓ مطابق' : '✗ غير مطابق'}`);
  } catch {
    console.log(`   جدول الـbackup ${BACKUP_TABLE}: غير موجود ✗`);
  }
  if (!backupOk) throw new Error('لا تنفيذ بدون جدول backup مطابق — راجع المرحلة 0');

  /* 1) حذف القمامة */
  console.log('\n4) حذف الصفوف الفاشلة:');
  for (const p of plan) {
    const del = await db.run(
      `DELETE FROM sitemap_urls WHERE media_type = '${p.mediaType}' AND (${SLUG_QUALITY_BAD})`
    );
    console.log(
      `   ${p.mediaType.padEnd(7)} حُذف ${del.rows_written ?? '?'} (المتوقع ${p.bad})` +
        (del.rows_written != null && Number(del.rows_written) !== p.bad ? '  ⚠️ اختلاف عن المتوقع' : '')
    );
  }

  /* 2) إعادة الترقيم — إزاحة ثم ترقيم (بلا تضارب PK) */
  console.log('\n5) إعادة ترقيم ordinal + shard + seq:');
  for (const p of plan) {
    await db.run(`UPDATE sitemap_urls SET ordinal = ordinal + ${OFFSET} WHERE media_type = '${p.mediaType}'`);
    const ren = await db.run(
      `UPDATE sitemap_urls SET
              ordinal = r.rn,
              shard   = (r.rn - 1) / ${SHARD_SIZE},
              seq     = ((r.rn - 1) % ${SHARD_SIZE}) + 1
         FROM (SELECT rowid AS rid, ROW_NUMBER() OVER (ORDER BY ordinal) AS rn
                 FROM sitemap_urls WHERE media_type = '${p.mediaType}') r
        WHERE sitemap_urls.rowid = r.rid`
    );
    console.log(`   ${p.mediaType.padEnd(7)} أعيد ترقيم ${ren.rows_written ?? '?'} صفًا (1..${p.keep})`);
  }

  await verifyPhase(db, plan);
  console.log('\nتم. الجدول نظيف ومُعاد ترقيمه. الصفحات نفسها (movies/tv_series) لم تُلمس.');
}

/* ── فحص سلامة نهائي ─────────────────────────────────────────────────────── */
async function verifyPhase(db, plan) {
  console.log('\n6) تحقق السلامة:');
  for (const p of plan) {
    const v = (
      await db.all(
        `SELECT COUNT(*) AS n, MIN(ordinal) AS min_ord, MAX(ordinal) AS max_ord, MAX(shard) AS max_shard
           FROM sitemap_urls WHERE media_type = '${p.mediaType}'`
      )
    )[0];
    const broken = (
      await db.all(
        `SELECT COUNT(*) AS n FROM sitemap_urls
          WHERE media_type = '${p.mediaType}'
            AND (shard != (ordinal - 1) / ${SHARD_SIZE} OR seq != ((ordinal - 1) % ${SHARD_SIZE}) + 1)`
      )
    )[0];
    const ok =
      Number(v.n) === p.keep &&
      Number(v.min_ord) === 1 &&
      Number(v.max_ord) === p.keep &&
      Number(v.max_shard) === p.newMaxShard &&
      Number(broken.n) === 0;
    console.log(
      `   ${p.mediaType.padEnd(7)} n=${v.n} ordinal=${v.min_ord}..${v.max_ord} ` +
        `max_shard=${v.max_shard} shard/seq mismatch=${broken.n} ${ok ? '✓' : '✗'}`
    );
    if (!ok) throw new Error('فحص السلامة فشل — استرجع من ' + BACKUP_TABLE);
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
