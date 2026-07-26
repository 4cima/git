const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const localDb = new Database(path.join(__dirname, '..', 'data', '4cima-local.db'));
const BATCH_SIZE = 200;

async function updateTable(tableName, items, label) {
  console.log(`\n${label}: ${items.length.toLocaleString()} سجل`);
  let done = 0;
  const start = Date.now();
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const stmts = batch.map(item => ({
      sql: `UPDATE ${tableName} SET backdrop_path = ? WHERE tmdb_id = ?`,
      args: [item.backdrop_path, item.tmdb_id]
    }));
    
    try {
      await turso.batch(stmts, 'write');
      done += batch.length;
      const pct = (done / items.length * 100).toFixed(1);
      const rate = (done / ((Date.now() - start) / 1000)).toFixed(0);
      const eta = ((items.length - done) / rate / 60).toFixed(1);
      process.stdout.write(`\r  ${pct}% | ${done.toLocaleString()}/${items.length.toLocaleString()} | ${rate}/s | ETA: ${eta}m   `);
    } catch (e) {
      console.error(`\n❌ Batch error: ${e.message}`);
    }
  }
  console.log(`\n✅ ${label} done!`);
}

async function main() {
  console.log('=== UPDATE backdrop_path IN TURSO ===\n');
  
  const movies = localDb.prepare(
    'SELECT tmdb_id, backdrop_path FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ""'
  ).all();
  
  const series = localDb.prepare(
    'SELECT tmdb_id, backdrop_path FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ""'
  ).all();
  
  console.log('LOCAL DB:');
  console.log(`  Movies: ${movies.length.toLocaleString()}`);
  console.log(`  Series: ${series.length.toLocaleString()}`);
  
  if (movies.length > 0) {
    await updateTable('movies', movies, '🎬 MOVIES');
  }
  
  if (series.length > 0) {
    await updateTable('tv_series', series, '📺 SERIES');
  }
  
  const checkM = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE backdrop_path IS NOT NULL');
  const checkS = await turso.execute('SELECT COUNT(*) as c FROM tv_series WHERE backdrop_path IS NOT NULL');
  
  console.log('\nFINAL COUNT IN TURSO:');
  console.log(`  Movies with backdrop: ${checkM.rows[0].c.toLocaleString()}`);
  console.log(`  Series with backdrop: ${checkS.rows[0].c.toLocaleString()}`);
  
  localDb.close();
  console.log('\n✅ UPDATE COMPLETE!');
}

main().catch(e => {
  console.error(`\n❌ Error: ${e.message}`);
  localDb.close();
  process.exit(1);
});
