require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('🔍 البحث عن الأفلام المكررة (نفس tmdb_id تحت أكثر من id):\n');
  
  const result = await turso.execute(`
    SELECT tmdb_id, COUNT(*) as c, GROUP_CONCAT(id) as ids, GROUP_CONCAT(title_en, ' | ') as titles
    FROM movies 
    GROUP BY tmdb_id 
    HAVING COUNT(*) > 1 
    LIMIT 50
  `);
  
  console.log('❌ عدد الأفلام المكررة:', result.rows.length);
  
  if (result.rows.length > 0) {
    console.log('\n🚨 التكرارات المكتشفة:\n');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. TMDB_ID: ${row.tmdb_id} (تكرر ${row.c} مرة)`);
      console.log(`   IDs: ${row.ids}`);
      console.log(`   Titles: ${row.titles}`);
      console.log('');
    });
  } else {
    console.log('\n✅ لا توجد تكرارات (نفس tmdb_id موجود مرة واحدة فقط)');
  }
  
  // فحص إضافي: عدد IDs الفريدة vs عدد TMDB_IDs الفريدة
  const countIds = await turso.execute('SELECT COUNT(DISTINCT id) as c FROM movies');
  const countTmdbIds = await turso.execute('SELECT COUNT(DISTINCT tmdb_id) as c FROM movies');
  const countTotal = await turso.execute('SELECT COUNT(*) as c FROM movies');
  
  console.log('\n📊 إحصائيات إضافية:');
  console.log('- إجمالي السجلات:', countTotal.rows[0].c);
  console.log('- IDs فريدة:', countIds.rows[0].c);
  console.log('- TMDB_IDs فريدة:', countTmdbIds.rows[0].c);
  
  if (countTotal.rows[0].c !== countIds.rows[0].c) {
    console.log('\n⚠️ يوجد IDs مكررة!');
  }
  
  if (countTotal.rows[0].c !== countTmdbIds.rows[0].c) {
    console.log('\n⚠️ يوجد TMDB_IDs مكررة!');
  }
}

main().catch(console.error);
