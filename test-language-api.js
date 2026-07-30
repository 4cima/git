const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function check() {
  console.log('فحص البيانات في Turso:\n');
  
  // Check if movies table exists and has data
  const moviesCount = await turso.execute('SELECT COUNT(*) as total FROM movies');
  console.log('إجمالي الأفلام في Turso:', moviesCount.rows[0].total);
  
  // Check original_language column
  const sampleMovies = await turso.execute('SELECT id, title_ar, original_language FROM movies LIMIT 5');
  console.log('\nعينة من الأفلام:');
  sampleMovies.rows.forEach(m => {
    console.log('-', m.title_ar, '| اللغة:', m.original_language);
  });
  
  // Count by language
  const langCounts = await turso.execute(`
    SELECT original_language, COUNT(*) as count 
    FROM movies 
    WHERE original_language IN ('ar', 'tr', 'ko', 'hi', 'ta', 'ml', 'zh', 'cn', 'en', 'fr', 'es', 'de', 'it', 'ru')
    GROUP BY original_language 
    ORDER BY count DESC
  `);
  
  console.log('\nعدد الأفلام حسب اللغة:');
  langCounts.rows.forEach(r => {
    console.log('-', r.original_language + ':', r.count);
  });
}

check().catch(console.error);
