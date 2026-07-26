require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص التناقض بين id و tmdb_id في Turso\n');

turso.execute(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN id = tmdb_id THEN 1 END) as matching,
    COUNT(CASE WHEN id != tmdb_id THEN 1 END) as mismatched
  FROM movies
`).then(result => {
  const stats = result.rows[0];
  
  console.log('📊 إحصائيات:');
  console.log(`   إجمالي الأفلام: ${stats.total}`);
  console.log(`   id = tmdb_id: ${stats.matching} (${(stats.matching/stats.total*100).toFixed(1)}%)`);
  console.log(`   id != tmdb_id: ${stats.mismatched} (${(stats.mismatched/stats.total*100).toFixed(1)}%)`);
  
  if (stats.mismatched > 0) {
    console.log('\n⚠️  يوجد أفلام في Turso حيث id != tmdb_id');
    console.log('هذا يعني أنها أُدخلت بالسكريبت القديم (قبل الإصلاح)');
    
    return turso.execute(`
      SELECT id, tmdb_id, title_ar
      FROM movies
      WHERE id != tmdb_id
      LIMIT 10
    `);
  }
  
  return null;
}).then(result => {
  if (result) {
    console.log('\n📝 أمثلة (أول 10):');
    result.rows.forEach(row => {
      console.log(`   id=${row.id}, tmdb_id=${row.tmdb_id} - ${row.title_ar}`);
    });
    
    console.log('\n💡 الحل: يجب تحديث هذه السجلات أو حذفها قبل المزامنة الجديدة');
  }
  
  process.exit(0);
}).catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
