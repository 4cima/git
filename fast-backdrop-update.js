const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const localDb = new Database('./data/4cima-local.db');

const BATCH_SIZE = 50;
const CONCURRENT = 5;

async function updateBatch(movies) {
  const statements = movies.map(m => ({
    sql: 'UPDATE movies SET backdrop_path = ? WHERE tmdb_id = ?',
    args: [m.backdrop_path, m.tmdb_id]
  }));
  
  try {
    await turso.batch(statements, 'write');
    return { success: movies.length, failed: 0 };
  } catch (error) {
    return { success: 0, failed: movies.length };
  }
}

async function fastUpdate() {
  console.log('Fast Backdrop Update\n');
  
  const allMovies = localDb.prepare('SELECT tmdb_id, backdrop_path FROM movies WHERE backdrop_path IS NOT NULL').all();
  console.log('Total movies:', allMovies.length, '\n');
  
  let totalUpdated = 0;
  let totalFailed = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < allMovies.length; i += BATCH_SIZE * CONCURRENT) {
    const batches = [];
    
    for (let j = 0; j < CONCURRENT; j++) {
      const start = i + (j * BATCH_SIZE);
      const batch = allMovies.slice(start, start + BATCH_SIZE);
      if (batch.length > 0) {
        batches.push(updateBatch(batch));
      }
    }
    
    const results = await Promise.all(batches);
    
    results.forEach(r => {
      totalUpdated += r.success;
      totalFailed += r.failed;
    });
    
    const progress = ((totalUpdated + totalFailed) / allMovies.length * 100).toFixed(1);
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = totalUpdated / elapsed;
    const eta = ((allMovies.length - totalUpdated - totalFailed) / rate / 60).toFixed(1);
    
    process.stdout.write(`\rProgress: ${progress}% | Updated: ${totalUpdated} | Rate: ${rate.toFixed(1)}/s | ETA: ${eta}m   `);
  }
  
  console.log('\n\nDone!');
  console.log('Updated:', totalUpdated);
  console.log('Failed:', totalFailed);
  console.log('Time:', ((Date.now() - startTime) / 1000 / 60).toFixed(1), 'minutes');
  
  const check = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL');
  console.log('Movies with backdrop in Turso:', check.rows[0].count);
  
  // Do the same for series
  console.log('\n\nUpdating TV Series...');
  const allSeries = localDb.prepare('SELECT tmdb_id, backdrop_path FROM tv_series WHERE backdrop_path IS NOT NULL').all();
  console.log('Total series:', allSeries.length);
  
  let seriesUpdated = 0;
  for (let i = 0; i < allSeries.length; i += BATCH_SIZE * CONCURRENT) {
    const batches = [];
    
    for (let j = 0; j < CONCURRENT; j++) {
      const start = i + (j * BATCH_SIZE);
      const batch = allSeries.slice(start, start + BATCH_SIZE);
      if (batch.length > 0) {
        batches.push((async (series) => {
          const statements = series.map(s => ({
            sql: 'UPDATE tv_series SET backdrop_path = ? WHERE tmdb_id = ?',
            args: [s.backdrop_path, s.tmdb_id]
          }));
          try {
            await turso.batch(statements, 'write');
            return series.length;
          } catch { return 0; }
        })(batch));
      }
    }
    
    const results = await Promise.all(batches);
    seriesUpdated += results.reduce((a, b) => a + b, 0);
    
    process.stdout.write(`\rSeries: ${((seriesUpdated / allSeries.length) * 100).toFixed(1)}% | ${seriesUpdated}/${allSeries.length}   `);
  }
  
  console.log('\n\nSeries updated:', seriesUpdated);
  
  const checkSeries = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE backdrop_path IS NOT NULL');
  console.log('Series with backdrop in Turso:', checkSeries.rows[0].count);
  
  localDb.close();
}

fastUpdate().catch(console.error);
