require('dotenv').config({ path: '.env.local' });
const Database = require('better-sqlite3');
const localDb = new Database('./data/4cima-local.db', { readonly: true });

console.log('🔍 تشخيص سريع: لماذا لا يوجد وصف عربي؟\n');

// 1️⃣ الأفلام بدون وصف عربي في القاعدة المحلية
const moviesNoAr = localDb.prepare(`
  SELECT id, tmdb_id, title_en, title_ar, overview_en, overview_ar, is_fetched, is_filtered, is_complete
  FROM movies
  WHERE is_fetched = 1 AND is_filtered = 0 AND (overview_ar IS NULL OR overview_ar = '')
  LIMIT 5
`).all();

console.log('🎬 عينات من الأفلام بدون وصف عربي:\n');
for (const m of moviesNoAr) {
  console.log(`ID: ${m.tmdb_id}`);
  console.log(`  العنوان: ${m.title_en}`);
  console.log(`  الوصف الإنجليزي: ${m.overview_en ? 'موجود' : '❌ غير موجود'}`);
  console.log(`  الوصف العربي: ${m.overview_ar ? 'موجود' : '❌ غير موجود'}`);
  console.log(`  مكتمل: ${m.is_complete ? 'نعم' : 'لا'}\n`);
}

// 2️⃣ إحصائيات
const stats = localDb.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN is_fetched = 1 AND is_filtered = 0 THEN 1 ELSE 0 END) as fetched_not_filtered,
    SUM(CASE WHEN is_fetched = 1 AND is_filtered = 0 AND overview_en IS NOT NULL AND overview_en != '' THEN 1 ELSE 0 END) as with_en_overview,
    SUM(CASE WHEN is_fetched = 1 AND is_filtered = 0 AND overview_ar IS NOT NULL AND overview_ar != '' THEN 1 ELSE 0 END) as with_ar_overview,
    SUM(CASE WHEN is_fetched = 1 AND is_filtered = 0 AND (overview_ar IS NULL OR overview_ar = '') THEN 1 ELSE 0 END) as without_ar_overview
  FROM movies
`).get();

console.log('📊 إحصائيات الأفلام:');
console.log(`  - إجمالي: ${stats.total}`);
console.log(`  - مسحوبة وغير مفلترة: ${stats.fetched_not_filtered}`);
console.log(`  - مع وصف إنجليزي: ${stats.with_en_overview}`);
console.log(`  - مع وصف عربي: ${stats.with_ar_overview}`);
console.log(`  - بدون وصف عربي: ${stats.without_ar_overview}\n`);

// 3️⃣ المسلسلات
const seriesStats = localDb.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN is_fetched = 1 AND is_filtered = 0 THEN 1 ELSE 0 END) as fetched_not_filtered,
    SUM(CASE WHEN is_fetched = 1 AND is_filtered = 0 AND overview_en IS NOT NULL AND overview_en != '' THEN 1 ELSE 0 END) as with_en_overview,
    SUM(CASE WHEN is_fetched = 1 AND is_filtered = 0 AND overview_ar IS NOT NULL AND overview_ar != '' THEN 1 ELSE 0 END) as with_ar_overview,
    SUM(CASE WHEN is_fetched = 1 AND is_filtered = 0 AND (overview_ar IS NULL OR overview_ar = '') THEN 1 ELSE 0 END) as without_ar_overview
  FROM tv_series
`).get();

console.log('📺 إحصائيات المسلسلات:');
console.log(`  - إجمالي: ${seriesStats.total}`);
console.log(`  - مسحوبة وغير مفلترة: ${seriesStats.fetched_not_filtered}`);
console.log(`  - مع وصف إنجليزي: ${seriesStats.with_en_overview}`);
console.log(`  - مع وصف عربي: ${seriesStats.with_ar_overview}`);
console.log(`  - بدون وصف عربي: ${seriesStats.without_ar_overview}\n`);

// 4️⃣ تحليل السبب
console.log('═'.repeat(60));
console.log('\n🔍 تحليل السبب:\n');

const moviesNoEnOverview = localDb.prepare(`
  SELECT COUNT(*) as count
  FROM movies
  WHERE is_fetched = 1 AND is_filtered = 0 AND (overview_en IS NULL OR overview_en = '')
`).get();

console.log(`🎬 الأفلام بدون وصف إنجليزي (لا يمكن ترجمتها):`);
console.log(`  - ${moviesNoEnOverview.count}`);

const seriesNoEnOverview = localDb.prepare(`
  SELECT COUNT(*) as count
  FROM tv_series
  WHERE is_fetched = 1 AND is_filtered = 0 AND (overview_en IS NULL OR overview_en = '')
`).get();

console.log(`\n📺 المسلسلات بدون وصف إنجليزي:`);
console.log(`  - ${seriesNoEnOverview.count}`);

console.log('\n═'.repeat(60));
console.log('\n✅ انتهى التشخيص\n');

localDb.close();
