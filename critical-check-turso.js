require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 الفحص الحرج: id != tmdb_id في Turso\n');
console.log('═'.repeat(70));

Promise.all([
  turso.execute('SELECT COUNT(*) as count FROM movies WHERE id != tmdb_id'),
  turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE id != tmdb_id')
]).then(([moviesResult, seriesResult]) => {
  const moviesCount = moviesResult.rows[0].count;
  const seriesCount = seriesResult.rows[0].count;
  
  console.log('\n📊 النتائج:\n');
  console.log(`   🎬 الأفلام: ${moviesCount} صف حيث id != tmdb_id`);
  console.log(`   📺 المسلسلات: ${seriesCount} صف حيث id != tmdb_id`);
  console.log('');
  console.log('═'.repeat(70));
  
  if (moviesCount === 0 && seriesCount === 0) {
    console.log('\n✅ **القاعدة نظيفة 100%!**');
    console.log('   كل صف في Turso لديه id = tmdb_id');
    console.log('   لا توجد بقايا من الباگ القديم');
    return null;
  } else {
    console.log('\n⚠️  **وُجدت صفوف قديمة من قبل الفكس**\n');
    
    const promises = [];
    
    if (moviesCount > 0) {
      console.log(`   ${moviesCount} فيلم محتاج معالجة`);
      promises.push(
        turso.execute(`
          SELECT id, tmdb_id, title_ar, title_en
          FROM movies 
          WHERE id != tmdb_id 
          LIMIT 20
        `).then(result => ({ type: 'movies', rows: result.rows }))
      );
    }
    
    if (seriesCount > 0) {
      console.log(`   ${seriesCount} مسلسل محتاج معالجة`);
      promises.push(
        turso.execute(`
          SELECT id, tmdb_id, name_ar, name_en
          FROM tv_series 
          WHERE id != tmdb_id 
          LIMIT 20
        `).then(result => ({ type: 'series', rows: result.rows }))
      );
    }
    
    return Promise.all(promises);
  }
}).then(results => {
  if (results && results.length > 0) {
    console.log('\n📝 أمثلة على الصفوف المحتاجة معالجة (أول 20):\n');
    
    results.forEach(({ type, rows }) => {
      console.log(`\n${type === 'movies' ? '🎬 الأفلام' : '📺 المسلسلات'}:`);
      rows.forEach(row => {
        const title = row.title_ar || row.name_ar || row.title_en || row.name_en;
        console.log(`   id=${row.id}, tmdb_id=${row.tmdb_id} → ${title}`);
      });
    });
    
    console.log('\n' + '═'.repeat(70));
    console.log('💡 يجب معالجة هذه الصفوف قبل المزامنة الواسعة');
  }
  
  process.exit(0);
}).catch(e => {
  console.error('\n❌ خطأ:', e.message);
  process.exit(1);
});
