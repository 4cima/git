const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const localDb = new Database('./data/4cima-local.db');

const BATCH_SIZE = 100;

async function batchUpdate() {
  console.log('BATCH UPDATE - Backdrops\n');
  
  const allMovies = localDb.prepare('SELECT tmdb_id, backdrop_path FROM movies WHERE backdrop_path IS NOT NULL').all();
  console.log('Total movies:', allMovies.length);
  
  const allSeries = localDb.prepare('SELECT tmdb_id, backdrop_path FROM tv_series WHERE backdrop_path IS NOT NULL').all();
  console.log('Total series:', allSeries.length);
  console.log('');
  
  let updated = 0;
  const start = Date.now();
  
  // Movies
  for (let i = 0; i < allMovies.length; i += BATCH_SIZE) {
    const batch = allMovies.slice(i, i + BATCH_SIZE);
    const statements = batch.map(m => ({
      sql: 'UPDATE movies SET backdrop_path = ? WHERE tmdb_id = ?',
      args: [m.backdrop_path, m.tmdb_id]
    }));
    
    try {
      await turso.batch(statements, 'write');
      updated += batch.length;
      
      const progress = (updated / allMovies.length * 100).toFixed(1);
      const rate = updated / ((Date.now() - start) / 1000);
      const eta = ((allMovies.length - updated) / rate / 60).toFixed(1);
      process.stdout.write(`\rMovies: ${progress}% | ${updated}/${allMovies.length} | ${rate.toFixed(1)}/s | ETA: ${eta}m     `);
    } catch (e) {
      console.error('\nBatch error:', e.message);
    }
  }
  
  console.log('\n\nMovies done!');
  
  // Series
  let seriesUpdated = 0;
  const seriesStart = Date.now();
  
  for (let i = 0; i < allSeries.length; i += BATCH_SIZE) {
    const batch = allSeries.slice(i, i + BATCH_SIZE);
    const statements = batch.map(s => ({
      sql: 'UPDATE tv_series SET backdrop_path = ? WHERE tmdb_id = ?',
      args: [s.backdrop_path, s.tmdb_id]
    }));
    
    try {
      await turso.batch(statements, 'write');
      seriesUpdated += batch.length;
      
      const progress = (seriesUpdated / allSeries.length * 100).toFixed(1);
      const rate = seriesUpdated / ((Date.now() - seriesStart) / 1000);
      const eta = ((allSeries.length - seriesUpdated) / rate / 60).toFixed(1);
      process.stdout.write(`\rSeries: ${progress}% | ${seriesUpdated}/${allSeries.length} | ${rate.toFixed(1)}/s | ETA: ${eta}m     `);
    } catch (e) {
      console.error('\nBatch error:', e.message);
    }
  }
  
  console.log('\n\nAll done!');
  console.log('Movies updated:', updated);
  console.log('Series updated:', seriesUpdated);
  console.log('Total time:', ((Date.now() - start) / 1000 / 60).toFixed(1), 'minutes');
  
  const checkM = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL');
  const checkS = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE backdrop_path IS NOT NULL');
  console.log('\nVerification:');
  console.log('Movies with backdrop in Turso:', checkM.rows[0].count);
  console.log('Series with backdrop in Turso:', checkS.rows[0].count);
  
  localDb.close();
}

batchUpdate().catch(console.error);
