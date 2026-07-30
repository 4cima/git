const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function fetchAndUpdate() {
  console.log('جلب وتحديث original_language من TMDB...\n');
  
  // Get all movies that need language data
  const moviesResult = await turso.execute('SELECT id, tmdb_id FROM movies WHERE original_language IS NULL');
  const movies = moviesResult.rows;
  
  console.log(`وجدت ${movies.length} فيلم يحتاج لتحديث اللغة\n`);
  
  if (movies.length === 0) {
    console.log('✅ كل الأفلام لديها بيانات اللغة بالفعل!');
    return;
  }
  
  let updated = 0;
  let failed = 0;
  
  // Process in batches to avoid rate limiting
  const batchSize = 10;
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (movie) => {
      try {
        // Fetch from TMDB
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}&language=ar`
        );
        
        if (!response.ok) {
          failed++;
          return;
        }
        
        const tmdbData = await response.json();
        
        if (tmdbData.original_language) {
          // Update in Turso
          await turso.execute({
            sql: 'UPDATE movies SET original_language = ? WHERE id = ?',
            args: [tmdbData.original_language, movie.id]
          });
          updated++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`خطأ في فيلم ${movie.tmdb_id}:`, error.message);
        failed++;
      }
    }));
    
    console.log(`معالجة: ${Math.min(i + batchSize, movies.length)} / ${movies.length} (نجح: ${updated}, فشل: ${failed})`);
    
    // Delay to respect rate limits
    if (i + batchSize < movies.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n✅ تم التحديث: ${updated} فيلم`);
  console.log(`❌ فشل: ${failed} فيلم\n`);
  
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

fetchAndUpdate().catch(console.error);
