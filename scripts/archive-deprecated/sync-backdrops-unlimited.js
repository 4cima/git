const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const localDb = new Database('./data/4cima-local.db');

const BATCH_SIZE = 100;
const CONCURRENT_BATCHES = 20;
const LOG_FILE = 'backdrop-sync.log';

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(msg);
}

async function updateBatch(movies) {
  const statements = movies.map(m => ({
    sql: 'UPDATE movies SET backdrop_path = ? WHERE tmdb_id = ?',
    args: [m.backdrop_path, m.tmdb_id]
  }));
  
  try {
    await turso.batch(statements, 'write');
    return { success: movies.length, failed: 0 };
  } catch (error) {
    log(`Batch error: ${error.message}`);
    return { success: 0, failed: movies.length };
  }
}

async function updateSeriesBatch(series) {
  const statements = series.map(s => ({
    sql: 'UPDATE tv_series SET backdrop_path = ? WHERE tmdb_id = ?',
    args: [s.backdrop_path, s.tmdb_id]
  }));
  
  try {
    await turso.batch(statements, 'write');
    return { success: series.length, failed: 0 };
  } catch (error) {
    log(`Series batch error: ${error.message}`);
    return { success: 0, failed: series.length };
  }
}

async function syncBackdrops() {
  log('========================================');
  log('BACKDROP SYNC - UNLIMITED SPEED');
  log('========================================');
  
  // MOVIES
  const allMovies = localDb.prepare('SELECT tmdb_id, backdrop_path FROM movies WHERE backdrop_path IS NOT NULL').all();
  log(`Total movies with backdrop: ${allMovies.length}`);
  log(`Batch size: ${BATCH_SIZE}`);
  log(`Concurrent batches: ${CONCURRENT_BATCHES}`);
  log('');
  
  let totalUpdated = 0;
  let totalFailed = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < allMovies.length; i += BATCH_SIZE * CONCURRENT_BATCHES) {
    const batches = [];
    
    for (let j = 0; j < CONCURRENT_BATCHES; j++) {
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
    
    const msg = `Movies: ${progress}% | ${totalUpdated}/${allMovies.length} | ${rate.toFixed(1)}/s | ETA: ${eta}m`;
    process.stdout.write(`\r${msg}                    `);
    
    if (totalUpdated % 10000 === 0 && totalUpdated > 0) {
      log(`\n${msg}`);
    }
  }
  
  console.log('');
  log(`Movies complete: ${totalUpdated} updated, ${totalFailed} failed`);
  log(`Time: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);
  
  const checkMovies = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL');
  log(`Movies with backdrop in Turso: ${checkMovies.rows[0].count}`);
  
  // TV SERIES
  log('\n========================================');
  log('Starting TV Series sync...');
  log('========================================');
  
  const allSeries = localDb.prepare('SELECT tmdb_id, backdrop_path FROM tv_series WHERE backdrop_path IS NOT NULL').all();
  log(`Total series with backdrop: ${allSeries.length}`);
  log('');
  
  let seriesUpdated = 0;
  let seriesFailed = 0;
  const seriesStartTime = Date.now();
  
  for (let i = 0; i < allSeries.length; i += BATCH_SIZE * CONCURRENT_BATCHES) {
    const batches = [];
    
    for (let j = 0; j < CONCURRENT_BATCHES; j++) {
      const start = i + (j * BATCH_SIZE);
      const batch = allSeries.slice(start, start + BATCH_SIZE);
      if (batch.length > 0) {
        batches.push(updateSeriesBatch(batch));
      }
    }
    
    const results = await Promise.all(batches);
    
    results.forEach(r => {
      seriesUpdated += r.success;
      seriesFailed += r.failed;
    });
    
    const progress = ((seriesUpdated + seriesFailed) / allSeries.length * 100).toFixed(1);
    const elapsed = (Date.now() - seriesStartTime) / 1000;
    const rate = seriesUpdated / elapsed;
    const eta = ((allSeries.length - seriesUpdated - seriesFailed) / rate / 60).toFixed(1);
    
    const msg = `Series: ${progress}% | ${seriesUpdated}/${allSeries.length} | ${rate.toFixed(1)}/s | ETA: ${eta}m`;
    process.stdout.write(`\r${msg}                    `);
    
    if (seriesUpdated % 5000 === 0 && seriesUpdated > 0) {
      log(`\n${msg}`);
    }
  }
  
  console.log('');
  log(`Series complete: ${seriesUpdated} updated, ${seriesFailed} failed`);
  log(`Time: ${((Date.now() - seriesStartTime) / 1000 / 60).toFixed(1)} minutes`);
  
  const checkSeries = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE backdrop_path IS NOT NULL');
  log(`Series with backdrop in Turso: ${checkSeries.rows[0].count}`);
  
  log('\n========================================');
  log('SYNC COMPLETE!');
  log('========================================');
  log(`Total movies: ${totalUpdated} updated, ${totalFailed} failed`);
  log(`Total series: ${seriesUpdated} updated, ${seriesFailed} failed`);
  log(`Total time: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);
  
  localDb.close();
}

syncBackdrops().catch(error => {
  log(`FATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
