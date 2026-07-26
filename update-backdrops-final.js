const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const localDb = new Database('./data/4cima-local.db');

async function updateBackdrops() {
  console.log('تحديث backdrop_path للأفلام الموجودة...\n');
  
  const moviesWithBackdrop = localDb.prepare('SELECT tmdb_id, backdrop_path FROM movies WHERE backdrop_path IS NOT NULL').all();
  
  console.log('عدد الأفلام:', moviesWithBackdrop.length);
  
  let updated = 0;
  let errors = 0;
  
  for (const movie of moviesWithBackdrop) {
    try {
      await turso.execute({
        sql: 'UPDATE movies SET backdrop_path = ? WHERE tmdb_id = ?',
        args: [movie.backdrop_path, movie.tmdb_id]
      });
      updated++;
      if (updated % 1000 === 0) console.log('Updated:', updated);
    } catch (error) {
      errors++;
    }
  }
  
  console.log('\nDone!');
  console.log('Updated:', updated);
  console.log('Errors:', errors);
  
  const checkTurso = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL');
  console.log('\nMovies with backdrop in Turso:', checkTurso.rows[0].count);
  
  localDb.close();
}

updateBackdrops().catch(console.error);
