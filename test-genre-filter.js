const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

(async () => {
  console.log('🔍 اختبار فلتر كوميديا:\n');
  
  // اختبار الفلتر الحالي
  const currentFilter = await client.execute({
    sql: `SELECT name_ar, genres_json FROM tv_series WHERE genres_json LIKE ? LIMIT 10`,
    args: [`%"name_ar":"كوميديا"%`]
  });
  
  console.log('النتائج بالفلتر الحالي (LIKE):');
  currentFilter.rows.forEach((row, i) => {
    console.log(`\n${i+1}. ${row.name_ar}`);
    const genres = JSON.parse(row.genres_json || '[]');
    console.log('   التصنيفات:', genres.map(g => g.name_ar).join(', '));
  });
  
  // اختبار Rick and Morty
  console.log('\n\n🔍 اختبار Rick and Morty:');
  const rickMorty = await client.execute({
    sql: `SELECT name_ar, name_en, genres_json FROM tv_series WHERE name_en LIKE '%Rick%Morty%' LIMIT 1`,
    args: []
  });
  
  if (rickMorty.rows.length > 0) {
    const row = rickMorty.rows[0];
    console.log('الاسم:', row.name_ar);
    const genres = JSON.parse(row.genres_json || '[]');
    console.log('التصنيفات:', genres.map(g => g.name_ar).join(', '));
    console.log('JSON:', row.genres_json);
    
    // هل يطابق الفلتر؟
    const matches = row.genres_json.includes('"name_ar":"كوميديا"');
    console.log('\nهل يطابق فلتر "كوميديا"؟', matches ? '✅ نعم' : '❌ لا');
  }
})();
