const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function checkGenres() {
  try {
    // Get all unique genres from both movies and series
    const moviesResult = await client.execute('SELECT DISTINCT genres_json FROM movies WHERE genres_json IS NOT NULL');
    const seriesResult = await client.execute('SELECT DISTINCT genres_json FROM tv_series WHERE genres_json IS NOT NULL');
    
    const allGenres = new Set();
    
    // Parse movie genres
    for (const row of moviesResult.rows) {
      try {
        const genres = JSON.parse(row.genres_json);
        genres.forEach(g => allGenres.add(g.name_ar));
      } catch (e) {}
    }
    
    // Parse series genres
    for (const row of seriesResult.rows) {
      try {
        const genres = JSON.parse(row.genres_json);
        genres.forEach(g => allGenres.add(g.name_ar));
      } catch (e) {}
    }
    
    console.log('\n🎬 كل التصنيفات الموجودة في القاعدة:');
    console.log('=====================================');
    const sortedGenres = Array.from(allGenres).sort();
    sortedGenres.forEach((genre, i) => {
      console.log(`${i + 1}. ${genre}`);
    });
    console.log(`\nإجمالي: ${sortedGenres.length} تصنيف`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkGenres();
