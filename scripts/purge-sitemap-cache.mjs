/**
 * scripts/purge-sitemap-cache.mjs
 *
 * إلزامي بعد كل نشر يلمس مسارات الـ sitemap (INDEXING-RECOVERY-PLAN.md):
 * كاش الحافة (Cache API + CDN) يوم كامل — بدون purge سيستمر جوجل في قراءة
 * النسخة القديمة حتى انتهاء المدة.
 *
 * يقرأ CF_CACHE_PURGE_TOKEN و CF_ZONE_ID من .env.local ثم ينقّي كل مسارات
 * /sitemap* المعروفة (الفهرس + الشظايا). خطة الباقي غير مفعّلة هنا عمداً —
 * purge بالملفات أدق ويكفي (15 ملفاً < حد 30).
 *
 * Usage: node scripts/purge-sitemap-cache.mjs [--verify]
 *   --verify  بعد الـ purge يفحص أن sitemap-index.xml يعرض الخريطتين المتوقعتين
 */
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).trim()];
    })
);

const { CF_CACHE_PURGE_TOKEN: TOKEN, CF_ZONE_ID: ZONE } = env;
if (!TOKEN || !ZONE) {
  console.error('CF_CACHE_PURGE_TOKEN / CF_ZONE_ID missing in .env.local');
  process.exit(1);
}

const BASE = 'https://4cima.com';
const files = [
  `${BASE}/sitemap-index.xml`,
  `${BASE}/sitemap/static.xml`,
  `${BASE}/sitemap/priority.xml`,
  ...Array.from({ length: 7 }, (_, i) => `${BASE}/sitemap/movies-${i}.xml`),
  ...Array.from({ length: 3 }, (_, i) => `${BASE}/sitemap/series-${i}.xml`),
];

const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}/purge_cache`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ files }),
});
const data = await res.json();
if (!data.success) {
  console.error('PURGE FAILED:', JSON.stringify(data.errors));
  process.exit(1);
}
console.log(`✓ purged ${files.length} sitemap URLs from edge cache`);

if (process.argv.includes('--verify')) {
  await new Promise((r) => setTimeout(r, 3000));
  const xml = await (await fetch(`${BASE}/sitemap-index.xml`, { cache: 'no-store' })).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log('sitemap-index.xml now lists:');
  for (const l of locs) console.log(`  ${l}`);
  const ok =
    locs.length === 2 &&
    locs[0] === `${BASE}/sitemap/static.xml` &&
    locs[1] === `${BASE}/sitemap/priority.xml`;
  console.log(ok ? '✓ verification passed (2 sitemaps only)' : '✗ UNEXPECTED — edge may still serve stale copy');
  process.exit(ok ? 0 : 1);
}
