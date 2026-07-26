require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/services/local-db');
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص شامل لسلامة البيانات\n');

// 1. فحص القاعدة المحلية
console.log('📊 القاعدة المحلية:');
console.log('─'.repeat(50));

const localStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN is_complete = 1 THEN 1 END) as complete,
    COUNT(CASE WHEN is_filtered = 1 THEN 1 END) as filtered,
    COUNT(CASE WHEN id != tmdb_id THEN 1 END) as id_mismatch,
    COUNT(CASE WHEN title_ar IS NOT NULL AND title_ar != 'TBD' THEN 1 END) as has_ar_title,
    COUNT(CASE WHEN title_en IS NOT NULL THEN 1 END) as has_en_title,
    COUNT(CASE WHEN overview_ar IS NOT NULL THEN 1 END) as has_ar_overview,
    COUNT(CASE WHEN poster_path IS NOT NULL THEN 1 END) as has_poster,
    COUNT(CASE WHEN backdrop_path IS NOT NULL THEN 1 END) as has_backdrop,
    COUNT(CASE WHEN genres_json IS NOT NULL THEN 1 END) as has_genres,
    COUNT(CASE WHEN cast_json IS NOT NULL THEN 1 END) as has_cast
  FROM movies
`).get();

console.log(`إجمالي الأفلام: ${localStats.total.toLocaleString()}`);
console.log(`أفلام مكتملة: ${localStats.complete.toLocaleString()} (${(localStats.complete/localStats.total*100).toFixed(1)}%)`);
console.log(`أفلام مفلترة: ${localStats.filtered.toLocaleString()} (${(localStats.filtered/localStats.total*100).toFixed(1)}%)`);
console.log(`أفلام id != tmdb_id: ${localStats.id_mismatch.toLocaleString()}`);
console.log('');
console.log('البيانات الموجودة:');
console.log(`  - عنوان عربي: ${localStats.has_ar_title.toLocaleString()} (${(localStats.has_ar_title/localStats.total*100).toFixed(1)}%)`);
console.log(`  - عنوان إنجليزي: ${localStats.has_en_title.toLocaleString()} (${(localStats.has_en_title/localStats.total*100).toFixed(1)}%)`);
console.log(`  - وصف عربي: ${localStats.has_ar_overview.toLocaleString()} (${(localStats.has_ar_overview/localStats.total*100).toFixed(1)}%)`);
console.log(`  - بوستر: ${localStats.has_poster.toLocaleString()} (${(localStats.has_poster/localStats.total*100).toFixed(1)}%)`);
console.log(`  - باكدروب: ${localStats.has_backdrop.toLocaleString()} (${(localStats.has_backdrop/localStats.total*100).toFixed(1)}%)`);
console.log(`  - تصنيفات: ${localStats.has_genres.toLocaleString()} (${(localStats.has_genres/localStats.total*100).toFixed(1)}%)`);
console.log(`  - ممثلين: ${localStats.has_cast.toLocaleString()} (${(localStats.has_cast/localStats.total*100).toFixed(1)}%)`);

// 2. عينة من البيانات
console.log('\n📝 عينة من البيانات المكتملة (آخر 10 أفلام):');
console.log('─'.repeat(50));

const sample = db.prepare(`
  SELECT 
    id, tmdb_id, title_en, title_ar, 
    CASE WHEN overview_ar IS NOT NULL THEN 'نعم' ELSE 'لا' END as has_overview,
    CASE WHEN poster_path IS NOT NULL THEN 'نعم' ELSE 'لا' END as has_poster,
    CASE WHEN backdrop_path IS NOT NULL THEN 'نعم' ELSE 'لا' END as has_backdrop,
    vote_average,
    updated_at
  FROM movies
  WHERE is_complete = 1
  ORDER BY updated_at DESC
  LIMIT 10
`).all();

sample.forEach(m => {
  console.log(`\n${m.title_ar || m.title_en}`);
  console.log(`  ID: ${m.id} | TMDB: ${m.tmdb_id} | ⭐ ${m.vote_average || 0}`);
  console.log(`  وصف: ${m.has_overview} | بوستر: ${m.has_poster} | باكدروب: ${m.has_backdrop}`);
  console.log(`  آخر تحديث: ${m.updated_at}`);
});

// 3. فحص Turso
console.log('\n\n📊 Turso:');
console.log('─'.repeat(50));

turso.execute(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN title_ar IS NOT NULL THEN 1 END) as has_ar_title,
    COUNT(CASE WHEN overview_ar IS NOT NULL THEN 1 END) as has_ar_overview,
    COUNT(CASE WHEN poster_path IS NOT NULL THEN 1 END) as has_poster,
    COUNT(CASE WHEN genres_json IS NOT NULL THEN 1 END) as has_genres,
    COUNT(CASE WHEN cast_json IS NOT NULL THEN 1 END) as has_cast
  FROM movies
`).then(result => {
  const tursoStats = result.rows[0];
  console.log(`إجمالي الأفلام: ${tursoStats.total.toLocaleString()}`);
  console.log('');
  console.log('البيانات الموجودة:');
  console.log(`  - عنوان عربي: ${tursoStats.has_ar_title.toLocaleString()} (${(tursoStats.has_ar_title/tursoStats.total*100).toFixed(1)}%)`);
  console.log(`  - وصف عربي: ${tursoStats.has_ar_overview.toLocaleString()} (${(tursoStats.has_ar_overview/tursoStats.total*100).toFixed(1)}%)`);
  console.log(`  - بوستر: ${tursoStats.has_poster.toLocaleString()} (${(tursoStats.has_poster/tursoStats.total*100).toFixed(1)}%)`);
  console.log(`  - تصنيفات: ${tursoStats.has_genres.toLocaleString()} (${(tursoStats.has_genres/tursoStats.total*100).toFixed(1)}%)`);
  console.log(`  - ممثلين: ${tursoStats.has_cast.toLocaleString()} (${(tursoStats.has_cast/tursoStats.total*100).toFixed(1)}%)`);
  
  // 4. فحص التكرارات
  return turso.execute(`
    SELECT tmdb_id, COUNT(*) as c
    FROM movies
    GROUP BY tmdb_id
    HAVING COUNT(*) > 1
  `);
}).then(result => {
  console.log('\n\n🔍 فحص التكرارات:');
  console.log('─'.repeat(50));
  if (result.rows.length === 0) {
    console.log('✅ لا توجد تكرارات في Turso');
  } else {
    console.log(`⚠️ توجد ${result.rows.length} تكرارات!`);
    result.rows.slice(0, 5).forEach(row => {
      console.log(`  tmdb_id=${row.tmdb_id} → ${row.c} نسخ`);
    });
  }
  
  console.log('\n✅ الفحص اكتمل!');
  process.exit(0);
}).catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
