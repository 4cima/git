require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔧 تنفيذ UPDATE لجعل id = tmdb_id\n');
console.log('═'.repeat(70));

async function main() {
  try {
    console.log('\n⚠️  هذا UPDATE على قاعدة الإنتاج (Turso)');
    console.log('📋 الأمر: UPDATE movies/tv_series SET id = tmdb_id WHERE id != tmdb_id\n');
    
    // ====== الأفلام ======
    console.log('🎬 الأفلام:');
    console.log('─'.repeat(70));
    
    const checkMoviesBefore = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE id != tmdb_id');
    const moviesCountBefore = checkMoviesBefore.rows[0].count;
    
    console.log(`📊 عدد الصفوف قبل التحديث: ${moviesCountBefore.toLocaleString()}`);
    
    if (moviesCountBefore > 0) {
      console.log('⏳ جاري التنفيذ...');
      
      const startTime = Date.now();
      await turso.execute('UPDATE movies SET id = tmdb_id WHERE id != tmdb_id');
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      const checkMoviesAfter = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE id != tmdb_id');
      const moviesCountAfter = checkMoviesAfter.rows[0].count;
      
      console.log(`✅ تم: ${(moviesCountBefore - moviesCountAfter).toLocaleString()} صف | ⏱️ ${elapsed}s`);
      console.log(`📊 الباقي: ${moviesCountAfter.toLocaleString()} صف`);
    } else {
      console.log('✅ لا توجد صفوف محتاجة تحديث');
    }
    
    // ====== المسلسلات ======
    console.log('\n📺 المسلسلات:');
    console.log('─'.repeat(70));
    
    const checkSeriesBefore = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE id != tmdb_id');
    const seriesCountBefore = checkSeriesBefore.rows[0].count;
    
    console.log(`📊 عدد الصفوف قبل التحديث: ${seriesCountBefore.toLocaleString()}`);
    
    if (seriesCountBefore > 0) {
      console.log('⏳ جاري التنفيذ...');
      
      const startTime = Date.now();
      await turso.execute('UPDATE tv_series SET id = tmdb_id WHERE id != tmdb_id');
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      const checkSeriesAfter = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE id != tmdb_id');
      const seriesCountAfter = checkSeriesAfter.rows[0].count;
      
      console.log(`✅ تم: ${(seriesCountBefore - seriesCountAfter).toLocaleString()} صف | ⏱️ ${elapsed}s`);
      console.log(`📊 الباقي: ${seriesCountAfter.toLocaleString()} صف`);
    } else {
      console.log('✅ لا توجد صفوف محتاجة تحديث');
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('🎉 UPDATE اكتمل للجدولين!');
    console.log('═'.repeat(70));
    
    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ في UPDATE:', e.message);
    process.exit(1);
  }
}

main();
