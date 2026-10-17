#!/usr/bin/env node
/**
 * scripts/migrate-numeric-slugs.js — ترحيل السلاج إلى النظام الرقمي الصريح (2026-10).
 *
 * الهدف: slug = CAST(tmdb_id AS TEXT) لكل صف في movies و tv_series، مع
 *   canonical_url = 'https://4cima.com/movies/' || tmdb_id  (أو /series/)
 *   seo_title_ar = NULL ، seo_description_ar = NULL
 *
 * لماذا دفعتان (two passes):
 *   تمريرة 0 — إخلاء مسبق يمنع اصطدام UNIQUE العابر (بترتيب تصاعدي آمن يعالج
     السلاسل: الدفعة الواحدة قد تحرّر سلاجًا تحتاجه دفعة لاحقة، والتكرار القصير
     يلتقطها كلها دون كتابة مكررة — idempotent).
 *   تمريرة 1: الكتابة الفعلية للسلاج الرقمي + canonical + تصفير SEO المخزّن.
 *
 * الأمان:
 *   - dry-run افتراضي (قراءة فقط). الكتابة فقط مع --apply.
 *   - idempotent: إعادة التشغيل لا تغيّر شيئًا (شرط WHERE يستبعد المطابِق).
 *   - دفعات id BETWEEN بخطوة 25000 (قراءات صغيرة، كتابات < 5k لكل دفعة).
 *   - لا 404: الصفحات/الـAPIs تطابق (slug = ? OR tmdb_id = ?) + redirect 308
 *     للرابط القانوني، وextractTmdbIdFromSlug يحلّ أي صيغة قديمة.
 *
 * الاستخدام:
 *   node scripts/migrate-numeric-slugs.js                      # dry-run (عدّ فقط)
 *   node scripts/migrate-numeric-slugs.js --apply               # تنفيذ كامل
 *   node scripts/migrate-numeric-slugs.js --apply --table=movies
 *   node scripts/migrate-numeric-slugs.js --apply --step=10000
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
const D1_QUERY_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

if (!TOKEN) {
  console.error('❌ CLOUDFLARE_D1_TOKEN مفقود في .env.local');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(=(.*))?$/);
    return m ? [m[1], m[3] === undefined ? true : m[3]] : [a, true];
  })
);
const APPLY = args.apply === true || args.apply === 'true';
const STEP = Math.max(1000, parseInt(args.step || '25000', 10));
const ONLY = String(args.table || 'both'); // movies | tv_series | both

const TABLES = [
  { table: 'movies', path: 'movies' },
  { table: 'tv_series', path: 'series' },
].filter((t) => ONLY === 'both' || ONLY === t.table || ONLY === t.path);

if (!TABLES.length) {
  console.error('❌ --table غير صالح (movies | tv_series | both)');
  process.exit(1);
}
async function d1(sql, params = []) {
  const r = await fetch(D1_QUERY_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  const j = await r.json();
  if (!j.success) throw new Error('D1: ' + JSON.stringify(j.errors));
  return j.result[0];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function migrateTable({ table, path }) {
  const range = await d1(`SELECT MIN(id) mn, MAX(id) mx, COUNT(*) c FROM ${table}`);
  const { mn, mx, c } = range.results[0];
  console.log(`\n── ${table}: ids ${mn}..${mx} (${c} صفًا)، خطوة ${STEP}`);

  if (!APPLY) {
    const need = await d1(
      `SELECT COUNT(*) c FROM ${table} WHERE tmdb_id IS NOT NULL AND (slug IS NULL OR slug != CAST(tmdb_id AS TEXT))`
    );
    const collide = await d1(
      `SELECT COUNT(*) c FROM ${table} WHERE tmdb_id IS NOT NULL AND slug = CAST(tmdb_id AS TEXT)`
    );
    console.log(`   يحتاج تحديثًا: ${need.results[0].c} · رقمي مصادِف سلفًا: ${collide.results[0].c}`);
    return { table, dry: true };
  }

  let cleared = 0;
  let updated = 0;
  const prefix = `https://4cima.com/${path}/`;

  for (let lo = mn; lo <= mx; lo += STEP) { // تمريرة 0: staging فريد لكل صف
    const res = await d1(
      `UPDATE ${table} SET slug = 'migrating-' || id, updated_at = datetime('now') ` +
        `WHERE id BETWEEN ? AND ? AND tmdb_id IS NOT NULL ` +
        `AND (slug IS NULL OR slug != CAST(tmdb_id AS TEXT)) AND slug NOT LIKE 'migrating-%'`,
      [lo, lo + STEP - 1]
    );
    cleared += res.meta?.changes ?? 0;
    await sleep(60);
  }
  console.log(`   تمريرة 0: مُرحَّل ${cleared} صفًا`);

  for (let lo = mn; lo <= mx; lo += STEP) { // تمريرة 1: فقط الصفوف المُمرحَلة
    const hi = lo + STEP - 1;
    const res = await d1(
      `UPDATE ${table} SET slug = CAST(tmdb_id AS TEXT), ` +
        `canonical_url = '${prefix}' || tmdb_id, ` +
        `seo_title_ar = NULL, seo_description_ar = NULL, updated_at = datetime('now') ` +
        `WHERE id BETWEEN ? AND ? AND tmdb_id IS NOT NULL AND slug LIKE 'migrating-%'`,
      [lo, hi]
    );
    const ch = res.meta?.changes ?? 0;
    updated += ch;
    if (ch > 0) console.log(`   [${lo}..${hi}] حدّث ${ch}`);
    await sleep(60);
  }
  console.log(`   تمريرة 1: حدّث ${updated} صفًا`);

  const left = await d1(
    `SELECT COUNT(*) c FROM ${table} WHERE tmdb_id IS NOT NULL AND (slug IS NULL OR slug != CAST(tmdb_id AS TEXT))`
  );
  const badCanon = await d1(
    `SELECT COUNT(*) c FROM ${table} WHERE tmdb_id IS NOT NULL AND (canonical_url IS NULL OR canonical_url != '${prefix}' || tmdb_id)`
  );
  const seoLeft = await d1(
    `SELECT COUNT(*) c FROM ${table} WHERE seo_title_ar IS NOT NULL OR seo_description_ar IS NOT NULL`
  );
  console.log(`   تحقق: متبقٍّ=${left.results[0].c} · canonical ناقص=${badCanon.results[0].c} · SEO متبقٍّ=${seoLeft.results[0].c}`);
  return { table, updated, cleared, left: left.results[0].c };
}

(async () => {
  console.log(APPLY ? '⚠️  وضع التنفيذ --apply' : '🔍 dry-run (قراءة فقط)');
  const out = [];
  for (const t of TABLES) out.push(await migrateTable(t));
  console.log('\nالملخص:', JSON.stringify(out));
})().catch((e) => {
  console.error('\n❌', e.message);
  process.exit(1);
});
