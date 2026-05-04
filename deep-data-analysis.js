const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db');

console.log('🔍 تحليل عميق شامل للبيانات\n');
console.log('═'.repeat(100));

// ============ الأفلام ============
console.log('\n🎬 تحليل الأفلام:\n');

const moviesTotal = db.prepare('SELECT COUNT(*) as c FROM movies').get().c;
const moviesFetched = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL').get().c;
const moviesComplete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 1').get().c;
const moviesFiltered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1').get().c;
const moviesIncomplete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 0 AND is_filtered = 0').get().c;

console.log(`📊 الإجمالي: ${moviesTotal.toLocaleString()}`);
console.log(`📥 المسحوب (له overview_en): ${moviesFetched.toLocaleString()} (${(moviesFetched/moviesTotal*100).toFixed(1)}%)`);
console.log(`✅ المكتمل: ${moviesComplete.toLocaleString()} (${(moviesComplete/moviesTotal*100).toFixed(1)}%)`);
console.log(`🚫 المفلتر: ${moviesFiltered.toLocaleString()} (${(moviesFiltered/moviesTotal*100).toFixed(1)}%)`);
console.log(`⏳ غير مكتمل: ${moviesIncomplete.toLocaleString()} (${(moviesIncomplete/moviesTotal*100).toFixed(1)}%)`);

// أسباب الفلترة للأفلام
console.log('\n📋 أسباب فلترة الأفلام:');
const movieFilterReasons = db.prepare(`
  SELECT filter_reason, COUNT(*) as count 
  FROM movies 
  WHERE is_filtered = 1 
  GROUP BY filter_reason 
  ORDER BY count DESC
`).all();

movieFilterReasons.forEach(r => {
  const reason = r.filter_reason || 'NULL';
  console.log(`  - ${reason}: ${r.count.toLocaleString()} (${(r.count/moviesFiltered*100).toFixed(1)}%)`);
});

// تفاصيل الأفلام غير المكتملة
console.log('\n📋 أسباب عدم اكتمال الأفلام:');
const moviesIncompleteReasons = db.prepare(`
  SELECT 
    CASE 
      WHEN overview_en IS NULL THEN 'بدون overview_en'
      WHEN poster_path IS NULL THEN 'بدون poster'
      WHEN vote_average IS NULL THEN 'بدون rating'
      WHEN keywords IS NULL OR keywords = '[]' THEN 'بدون keywords'
      ELSE 'أخرى'
    END as reason,
    COUNT(*) as count
  FROM movies
  WHERE is_complete = 0 AND is_filtered = 0
  GROUP BY reason
  ORDER BY count DESC
`).all();

moviesIncompleteReasons.forEach(r => {
  console.log(`  - ${r.reason}: ${r.count.toLocaleString()}`);
});

// ============ المسلسلات ============
console.log('\n\n📺 تحليل المسلسلات:\n');

const seriesTotal = db.prepare('SELECT COUNT(*) as c FROM tv_series').get().c;
const seriesFetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NOT NULL').get().c;
const seriesComplete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 1').get().c;
const seriesFiltered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1').get().c;
const seriesIncomplete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 0 AND is_filtered = 0').get().c;

console.log(`📊 الإجمالي: ${seriesTotal.toLocaleString()}`);
console.log(`📥 المسحوب (له overview_ar): ${seriesFetched.toLocaleString()} (${(seriesFetched/seriesTotal*100).toFixed(1)}%)`);
console.log(`✅ المكتمل: ${seriesComplete.toLocaleString()} (${(seriesComplete/seriesTotal*100).toFixed(1)}%)`);
console.log(`🚫 المفلتر: ${seriesFiltered.toLocaleString()} (${(seriesFiltered/seriesTotal*100).toFixed(1)}%)`);
console.log(`⏳ غير مكتمل: ${seriesIncomplete.toLocaleString()} (${(seriesIncomplete/seriesTotal*100).toFixed(1)}%)`);

// أسباب الفلترة للمسلسلات
console.log('\n📋 أسباب فلترة المسلسلات:');
const seriesFilterReasons = db.prepare(`
  SELECT filter_reason, COUNT(*) as count 
  FROM tv_series 
  WHERE is_filtered = 1 
  GROUP BY filter_reason 
  ORDER BY count DESC
`).all();

seriesFilterReasons.forEach(r => {
  const reason = r.filter_reason || 'NULL';
  console.log(`  - ${reason}: ${r.count.toLocaleString()} (${(r.count/seriesFiltered*100).toFixed(1)}%)`);
});

// تفاصيل المسلسلات غير المكتملة
console.log('\n📋 أسباب عدم اكتمال المسلسلات:');
const seriesIncompleteReasons = db.prepare(`
  SELECT 
    CASE 
      WHEN overview_ar IS NULL THEN 'بدون overview_ar'
      WHEN poster_path IS NULL THEN 'بدون poster'
      WHEN vote_average IS NULL THEN 'بدون rating'
      WHEN keywords IS NULL OR keywords = '[]' THEN 'بدون keywords'
      WHEN number_of_seasons IS NULL OR number_of_seasons = 0 THEN 'بدون seasons'
      ELSE 'أخرى'
    END as reason,
    COUNT(*) as count
  FROM tv_series
  WHERE is_complete = 0 AND is_filtered = 0
  GROUP BY reason
  ORDER BY count DESC
`).all();

seriesIncompleteReasons.forEach(r => {
  console.log(`  - ${r.reason}: ${r.count.toLocaleString()}`);
});

// ============ إحصائيات التصفية ============
console.log('\n\n🔍 إحصائيات التصفية المتقدمة:\n');

// الأفلام بدون overview
const moviesNoOverview = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL').get().c;
console.log(`🎬 أفلام بدون overview_en: ${moviesNoOverview.toLocaleString()}`);

// الأفلام بدون poster
const moviesNoPoster = db.prepare('SELECT COUNT(*) as c FROM movies WHERE poster_path IS NULL').get().c;
console.log(`🎬 أفلام بدون poster: ${moviesNoPoster.toLocaleString()}`);

// الأفلام برقم منخفض
const moviesLowRating = db.prepare('SELECT COUNT(*) as c FROM movies WHERE vote_average < 5').get().c;
console.log(`🎬 أفلام برقم < 5: ${moviesLowRating.toLocaleString()}`);

// المسلسلات بدون overview
const seriesNoOverview = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NULL').get().c;
console.log(`📺 مسلسلات بدون overview_ar: ${seriesNoOverview.toLocaleString()}`);

// المسلسلات بدون poster
const seriesNoPoster = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE poster_path IS NULL').get().c;
console.log(`📺 مسلسلات بدون poster: ${seriesNoPoster.toLocaleString()}`);

// ============ جودة البيانات ============
console.log('\n\n📊 جودة البيانات (بناءً على المسحوب فقط):\n');

const moviesQuality = (moviesComplete / moviesFetched * 100).toFixed(1);
const seriesQuality = (seriesComplete / seriesFetched * 100).toFixed(1);

console.log(`🎬 جودة الأفلام: ${moviesQuality}% (${moviesComplete.toLocaleString()} / ${moviesFetched.toLocaleString()})`);
console.log(`📺 جودة المسلسلات: ${seriesQuality}% (${seriesComplete.toLocaleString()} / ${seriesFetched.toLocaleString()})`);

// ============ الملخص ============
console.log('\n\n' + '═'.repeat(100));
console.log('📋 الملخص:\n');

console.log('🎬 الأفلام:');
console.log(`  - إجمالي: ${moviesTotal.toLocaleString()}`);
console.log(`  - مسحوب: ${moviesFetched.toLocaleString()} (${(moviesFetched/moviesTotal*100).toFixed(1)}%)`);
console.log(`  - مكتمل: ${moviesComplete.toLocaleString()} (${(moviesComplete/moviesFetched*100).toFixed(1)}% من المسحوب)`);
console.log(`  - مفلتر: ${moviesFiltered.toLocaleString()}`);
console.log(`  - غير مكتمل: ${moviesIncomplete.toLocaleString()}`);

console.log('\n📺 المسلسلات:');
console.log(`  - إجمالي: ${seriesTotal.toLocaleString()}`);
console.log(`  - مسحوب: ${seriesFetched.toLocaleString()} (${(seriesFetched/seriesTotal*100).toFixed(1)}%)`);
console.log(`  - مكتمل: ${seriesComplete.toLocaleString()} (${(seriesComplete/seriesFetched*100).toFixed(1)}% من المسحوب)`);
console.log(`  - مفلتر: ${seriesFiltered.toLocaleString()}`);
console.log(`  - غير مكتمل: ${seriesIncomplete.toLocaleString()}`);

db.close();
