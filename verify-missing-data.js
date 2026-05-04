const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

console.log('🔍 التحقق من البيانات الناقصة\n');
console.log('═'.repeat(80));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1️⃣ الأعمال التي لم يتم سحبها (بدون overview_en)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n❌ الأعمال التي لم يتم سحبها (بدون overview_en):');
console.log('─'.repeat(80));

const moviesNotFetched = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE overview_en IS NULL AND is_filtered = 0
`).get();

const seriesNotFetched = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE overview_en IS NULL AND is_filtered = 0
`).get();

console.log(`🎬 أفلام: ${moviesNotFetched.count.toLocaleString()}`);
console.log(`📺 مسلسلات: ${seriesNotFetched.count.toLocaleString()}`);
console.log(`📊 الإجمالي: ${(moviesNotFetched.count + seriesNotFetched.count).toLocaleString()}`);

// عينة من الأعمال غير المسحوبة
if (moviesNotFetched.count > 0) {
  console.log('\n📋 عينة من الأفلام غير المسحوبة:');
  const sampleMovies = db.prepare(`
    SELECT id, title_en, title_ar FROM movies
    WHERE overview_en IS NULL AND is_filtered = 0
    LIMIT 5
  `).all();
  sampleMovies.forEach(m => {
    console.log(`   - ID: ${m.id} | ${m.title_en || m.title_ar || 'بدون عنوان'}`);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2️⃣ الأعمال المسحوبة لكن ناقصة cast
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n⚠️  الأعمال المسحوبة لكن ناقصة cast:');
console.log('─'.repeat(80));

const moviesNoCast = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
  AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie')
`).get();

const seriesNoCast = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
  AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = tv_series.id AND content_type = 'tv')
`).get();

console.log(`🎬 أفلام: ${moviesNoCast.count.toLocaleString()}`);
console.log(`📺 مسلسلات: ${seriesNoCast.count.toLocaleString()}`);
console.log(`📊 الإجمالي: ${(moviesNoCast.count + seriesNoCast.count).toLocaleString()}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3️⃣ الأعمال المسحوبة لكن ناقصة genres
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n⚠️  الأعمال المسحوبة لكن ناقصة genres:');
console.log('─'.repeat(80));

const moviesNoGenres = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
  AND NOT EXISTS (SELECT 1 FROM content_genres WHERE content_id = movies.id AND content_type = 'movie')
`).get();

const seriesNoGenres = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
  AND NOT EXISTS (SELECT 1 FROM content_genres WHERE content_id = tv_series.id AND content_type = 'tv')
`).get();

console.log(`🎬 أفلام: ${moviesNoGenres.count.toLocaleString()}`);
console.log(`📺 مسلسلات: ${seriesNoGenres.count.toLocaleString()}`);
console.log(`📊 الإجمالي: ${(moviesNoGenres.count + seriesNoGenres.count).toLocaleString()}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4️⃣ الأعمال المسحوبة لكن ناقصة ترجمة عربية
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n⚠️  الأعمال المسحوبة لكن ناقصة ترجمة عربية:');
console.log('─'.repeat(80));

const moviesNoArabic = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
  AND (title_ar IS NULL OR title_ar = 'TBD' OR overview_ar IS NULL OR overview_ar = '')
`).get();

const seriesNoArabic = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
  AND (title_ar IS NULL OR title_ar = 'TBD' OR overview_ar IS NULL OR overview_ar = '')
`).get();

console.log(`🎬 أفلام: ${moviesNoArabic.count.toLocaleString()}`);
console.log(`📺 مسلسلات: ${seriesNoArabic.count.toLocaleString()}`);
console.log(`📊 الإجمالي: ${(moviesNoArabic.count + seriesNoArabic.count).toLocaleString()}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5️⃣ المسلسلات المسحوبة لكن بدون مواسم
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n⚠️  المسلسلات المسحوبة لكن بدون مواسم:');
console.log('─'.repeat(80));

const seriesNoSeasons = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
  AND number_of_seasons > 0
  AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_id = tv_series.id)
`).get();

console.log(`📺 مسلسلات: ${seriesNoSeasons.count.toLocaleString()}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6️⃣ الأعمال الغير مكتملة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n⚠️  الأعمال الغير مكتملة (is_complete = 0):');
console.log('─'.repeat(80));

const moviesIncomplete = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE is_complete = 0 AND is_filtered = 0
`).get();

const seriesIncomplete = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE is_complete = 0 AND is_filtered = 0
`).get();

console.log(`🎬 أفلام: ${moviesIncomplete.count.toLocaleString()}`);
console.log(`📺 مسلسلات: ${seriesIncomplete.count.toLocaleString()}`);
console.log(`📊 الإجمالي: ${(moviesIncomplete.count + seriesIncomplete.count).toLocaleString()}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7️⃣ الخلاصة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n📊 الخلاصة:');
console.log('═'.repeat(80));

const totalIssues = 
  moviesNotFetched.count + seriesNotFetched.count +
  moviesNoCast.count + seriesNoCast.count +
  moviesNoGenres.count + seriesNoGenres.count +
  moviesNoArabic.count + seriesNoArabic.count +
  seriesNoSeasons.count;

if (totalIssues === 0) {
  console.log('✅ لا توجد بيانات ناقصة - جميع الأعمال مكتملة!');
} else {
  console.log(`⚠️  يوجد ${totalIssues.toLocaleString()} مشكلة في البيانات`);
  console.log('\n📋 التفاصيل:');
  if (moviesNotFetched.count + seriesNotFetched.count > 0) {
    console.log(`   ❌ لم يتم سحبها: ${(moviesNotFetched.count + seriesNotFetched.count).toLocaleString()}`);
  }
  if (moviesNoCast.count + seriesNoCast.count > 0) {
    console.log(`   ⚠️  بدون cast: ${(moviesNoCast.count + seriesNoCast.count).toLocaleString()}`);
  }
  if (moviesNoGenres.count + seriesNoGenres.count > 0) {
    console.log(`   ⚠️  بدون genres: ${(moviesNoGenres.count + seriesNoGenres.count).toLocaleString()}`);
  }
  if (moviesNoArabic.count + seriesNoArabic.count > 0) {
    console.log(`   ⚠️  بدون ترجمة عربية: ${(moviesNoArabic.count + seriesNoArabic.count).toLocaleString()}`);
  }
  if (seriesNoSeasons.count > 0) {
    console.log(`   ⚠️  مسلسلات بدون مواسم: ${seriesNoSeasons.count.toLocaleString()}`);
  }
}

console.log('\n' + '═'.repeat(80) + '\n');

db.close();
