require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('🔍 فحص السجلات المتضررة:\n');
  
  // السجلات القديمة التي تم تحديثها اليوم
  const result = await turso.execute(`
    SELECT id, tmdb_id, slug, title_en, title_ar, created_at, updated_at 
    FROM movies 
    WHERE updated_at >= '2026-07-20' 
    AND created_at < '2026-07-19' 
    ORDER BY updated_at DESC 
    LIMIT 100
  `);
  
  console.log('❌ عدد السجلات القديمة اللي اتلمست النهاردة (احتمال فساد):', result.rows.length);
  console.log('\n📋 أول 20 سجل:\n');
  
  result.rows.slice(0, 20).forEach((row, i) => {
    console.log(`${i+1}. ID: ${row.id} | TMDB: ${row.tmdb_id}`);
    console.log(`   EN: ${row.title_en}`);
    console.log(`   AR: ${row.title_ar}`);
    console.log(`   Created: ${row.created_at} | Updated: ${row.updated_at}`);
    console.log(`   Slug: ${row.slug}`);
    console.log('');
  });
  
  // فحص تطابق tmdb_id مع id
  console.log('\n🔍 فحص تطابق ID:\n');
  const mismatch = result.rows.filter(r => r.id !== r.tmdb_id).slice(0, 10);
  console.log('عدد السجلات حيث id != tmdb_id:', mismatch.length);
  
  if (mismatch.length > 0) {
    console.log('\nأمثلة:');
    mismatch.forEach(r => {
      console.log(`- ID: ${r.id} vs TMDB_ID: ${r.tmdb_id} (${r.title_en})`);
    });
  }
}

main().catch(console.error);
