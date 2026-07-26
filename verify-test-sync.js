require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = require('./scripts/services/local-db');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص المزامنة في Turso\n');
console.log('═'.repeat(70));

// 1. فحص التكرارات
console.log('\n1️⃣  فحص التكرارات (نفس tmdb_id):\n');

turso.execute(`
  SELECT tmdb_id, COUNT(*) as c, GROUP_CONCAT(id) as ids
  FROM movies
  GROUP BY tmdb_id
  HAVING COUNT(*) > 1
  LIMIT 10
`).then(result => {
  if (result.rows.length === 0) {
    console.log('✅ لا توجد تكرارات - كل tmdb_id فريد!');
  } else {
    console.log(`⚠️  وُجد ${result.rows.length} تكرارات:`);
    result.rows.forEach(row => {
      console.log(`   tmdb_id=${row.tmdb_id} → موجود ${row.c} مرة (ids: ${row.ids})`);
    });
  }
  
  // 2. فحص الأفلام المُزامنة حديثاً
  console.log('\n2️⃣  آخر 10 أفلام تمت مزامنتها:\n');
  return turso.execute(`
    SELECT id, tmdb_id, title_ar, title_en, 
           CASE WHEN poster_path IS NOT NULL THEN 'نعم' ELSE 'لا' END as has_poster,
           CASE WHEN overview_ar IS NOT NULL THEN 'نعم' ELSE 'لا' END as has_overview,
           vote_average,
           updated_at
    FROM movies
    ORDER BY updated_at DESC
    LIMIT 10
  `);
}).then(result => {
  result.rows.forEach(row => {
    console.log(`📽️  ${row.title_ar || row.title_en}`);
    console.log(`   id=${row.id} | tmdb_id=${row.tmdb_id} | ⭐${row.vote_average || 0}`);
    console.log(`   بوستر: ${row.has_poster} | وصف: ${row.has_overview}`);
    console.log(`   آخر تحديث: ${row.updated_at}\n`);
  });
  
  // 3. فحص عينة من البيانات المُحدثة
  console.log('3️⃣  فحص تحديث البيانات (مقارنة محلي vs Turso):\n');
  
  // جلب عينة من القاعدة المحلية
  const localSample = db.prepare(`
    SELECT id, tmdb_id, title_en, poster_path, overview_ar, vote_average
    FROM movies
    WHERE synced_to_turso = 1
    ORDER BY synced_at DESC
    LIMIT 5
  `).all();
  
  if (localSample.length === 0) {
    console.log('⚠️  لا توجد أفلام مُزامنة في القاعدة المحلية');
    return;
  }
  
  const tmdbIds = localSample.map(m => m.tmdb_id).join(',');
  
  return turso.execute(`
    SELECT id, tmdb_id, title_en, poster_path, overview_ar, vote_average
    FROM movies
    WHERE tmdb_id IN (${tmdbIds})
  `).then(tursoResult => {
    console.log('مقارنة البيانات:\n');
    
    localSample.forEach(local => {
      const tursoRow = tursoResult.rows.find(t => t.tmdb_id === local.tmdb_id);
      
      if (!tursoRow) {
        console.log(`❌ ${local.title_en} (tmdb_id=${local.tmdb_id}) - غير موجود في Turso!`);
        return;
      }
      
      console.log(`📊 ${local.title_en}:`);
      
      // مقارنة id (يجب أن يكون tmdb_id)
      if (tursoRow.id === local.tmdb_id) {
        console.log(`   ✅ id في Turso = tmdb_id (${tursoRow.id})`);
      } else {
        console.log(`   ⚠️  id في Turso (${tursoRow.id}) != tmdb_id (${local.tmdb_id})`);
      }
      
      // مقارنة البوستر
      if (local.poster_path === tursoRow.poster_path) {
        console.log(`   ✅ البوستر متطابق`);
      } else {
        console.log(`   ⚠️  البوستر مختلف`);
        console.log(`      محلي: ${local.poster_path}`);
        console.log(`      Turso: ${tursoRow.poster_path}`);
      }
      
      // مقارنة الوصف
      const localOverview = (local.overview_ar || '').substring(0, 50);
      const tursoOverview = (tursoRow.overview_ar || '').substring(0, 50);
      if (localOverview === tursoOverview) {
        console.log(`   ✅ الوصف متطابق`);
      } else {
        console.log(`   ⚠️  الوصف مختلف (أول 50 حرف)`);
      }
      
      console.log('');
    });
  });
  
}).then(() => {
  // 4. إحصائيات عامة
  console.log('4️⃣  إحصائيات Turso:\n');
  return turso.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN title_ar IS NOT NULL THEN 1 END) as has_ar,
      COUNT(CASE WHEN overview_ar IS NOT NULL THEN 1 END) as has_overview,
      COUNT(CASE WHEN poster_path IS NOT NULL THEN 1 END) as has_poster
    FROM movies
  `);
}).then(result => {
  const stats = result.rows[0];
  console.log(`📊 إجمالي الأفلام في Turso: ${stats.total}`);
  console.log(`   عنوان عربي: ${stats.has_ar} (${(stats.has_ar/stats.total*100).toFixed(1)}%)`);
  console.log(`   وصف عربي: ${stats.has_overview} (${(stats.has_overview/stats.total*100).toFixed(1)}%)`);
  console.log(`   بوستر: ${stats.has_poster} (${(stats.has_poster/stats.total*100).toFixed(1)}%)`);
  
  console.log('\n' + '═'.repeat(70));
  console.log('✅ الفحص اكتمل!');
  process.exit(0);
}).catch(e => {
  console.error('\n❌ خطأ:', e.message);
  process.exit(1);
});
