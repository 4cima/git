require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 البحث عن أفلام مكررة في Turso (نفس tmdb_id تحت أكثر من id)...\n');

turso.execute(`
  SELECT tmdb_id, COUNT(*) as c, GROUP_CONCAT(id) as ids, GROUP_CONCAT(title_en, ' | ') as titles
  FROM movies
  GROUP BY tmdb_id
  HAVING COUNT(*) > 1
  LIMIT 50
`).then(result => {
  console.log(`📊 عدد الأفلام المكررة: ${result.rows.length}\n`);
  
  if (result.rows.length > 0) {
    console.log('🚨 أمثلة على التكرارات:\n');
    result.rows.forEach(row => {
      console.log(`tmdb_id=${row.tmdb_id} → ids: ${row.ids} | titles: ${row.titles}`);
    });
  } else {
    console.log('✅ لا توجد تكرارات في Turso');
  }
  
  process.exit(0);
}).catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
