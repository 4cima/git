require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص أمان التحديث (id = tmdb_id)\n');
console.log('═'.repeat(70));

// فحص: هل يوجد تصادم محتمل؟
turso.execute(`
  SELECT COUNT(*) as count
  FROM movies m1
  JOIN movies m2 ON m1.tmdb_id = m2.id
  WHERE m1.id != m1.tmdb_id AND m2.id != m2.tmdb_id
`).then(result => {
  const movieCollisions = result.rows[0].count;
  
  return turso.execute(`
    SELECT COUNT(*) as count
    FROM tv_series s1
    JOIN tv_series s2 ON s1.tmdb_id = s2.id
    WHERE s1.id != s1.tmdb_id AND s2.id != s2.tmdb_id
  `).then(result2 => {
    const seriesCollisions = result2.rows[0].count;
    
    console.log('\n📊 فحص التصادمات المحتملة:\n');
    console.log(`   🎬 الأفلام: ${movieCollisions} تصادم`);
    console.log(`   📺 المسلسلات: ${seriesCollisions} تصادم`);
    console.log('');
    console.log('═'.repeat(70));
    
    if (movieCollisions === 0 && seriesCollisions === 0) {
      console.log('\n✅ **التحديث آمن 100%!**');
      console.log('\nيمكن تنفيذ:');
      console.log('```sql');
      console.log('UPDATE movies SET id = tmdb_id WHERE id != tmdb_id;');
      console.log('UPDATE tv_series SET id = tmdb_id WHERE id != tmdb_id;');
      console.log('```');
      console.log('\nبدون أي تصادمات أو مشاكل.');
    } else {
      console.log('\n⚠️  **يوجد تصادمات!**');
      console.log('\nالتحديث المباشر سيفشل.');
      console.log('يجب استخدام الخيار 2 (الحذف) أو الخيار 3 (قاعدة جديدة).');
    }
  });
}).then(() => {
  process.exit(0);
}).catch(e => {
  console.error('\n❌ خطأ:', e.message);
  process.exit(1);
});
