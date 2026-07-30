const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const localDb = new Database('./local.db');

async function sync() {
  console.log('مزامنة original_language من local.db إلى Turso...\n');
  
  // Get all movies with original_language from local
  const localMovies = localDb.prepare(`
    SELECT tmdb_id, original_language 
    FROM movies 
    WHERE original_language IS NOT NULL AND tmdb_id IS NOT NULL
  `).all();
  
  console.log(`وجدت ${localMovies.length} فيلم بها بيانات اللغة في local.db\n`);
  
  if (localMovies.length === 0) {
    console.log('❌ لا توجد بيانات لغة في القاعدة المحلية!');
    return;
  }
  
  let updated = 0;
  let notFound = 0;
  
  // Update in batches
  const batchSize = 50;
  for (let i = 0; i < localMovies.length; i += batchSize) {
    const batch = localMovies.slice(i, i + batchSize);
    
    for (const movie of batch) {
      try {
        await turso.execute({
          sql: 'UPDATE movies SET original_language = ? WHERE tmdb_id = ?',
          args: [movie.original_language, movie.tmdb_id]
        });
        updated++;
      } catch (error) {
        notFound++;
      }
    }
    
    if ((i + batchSize) % 100 === 0) {
      console.log(`معالجة: ${Math.min(i + batchSize, localMovies.length)} / ${localMovies.length}`);
    }
  }
  
  console.log(`\n✅ تم التحديث: ${updated} فيلم`);
  console.log(`⚠️ غير موجود في Turso: ${notFound} فيلم\n`);
  
  // Verify counts
  const langCounts = await turso.execute(`
    SELECT original_language, COUNT(*) as count 
    FROM movies 
    WHERE original_language IN ('ar', 'tr', 'ko', 'hi', 'ta', 'ml', 'zh', 'cn', 'en', 'fr', 'es', 'de', 'it', 'ru')
    GROUP BY original_language 
    ORDER BY count DESC
  `);
  
  console.log('عدد الأفلام حسب اللغة في Turso:');
  langCounts.rows.forEach(r => {
    console.log(`- ${r.original_language}: ${r.count}`);
  });
}

sync().catch(console.error);
