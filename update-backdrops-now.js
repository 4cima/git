const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const localDb = new Database('./data/4cima-local.db');

const BATCH = 100;

async function run() {
  console.log('UPDATE Backdrops - START\n');
  
  const movies = localDb.prepare('SELECT tmdb_id, backdrop_path FROM movies WHERE backdrop_path IS NOT NULL').all();
  const series = localDb.prepare('SELECT tmdb_id, backdrop_path FROM tv_series WHERE backdrop_path IS NOT NULL').all();
  
  console.log('Movies:', movies.length);
  console.log('Series:', series.length, '\n');
  
  let done = 0;
  const start = Date.now();
  
  for (let i = 0; i < movies.length; i += BATCH) {
    const batch = movies.slice(i, i + BATCH);
    const stmts = batch.map(m => ({ sql: 'UPDATE movies SET backdrop_path = ? WHERE tmdb_id = ?', args: [m.backdrop_path, m.tmdb_id] }));
    
    try {
      await turso.batch(stmts, 'write');
      done += batch.length;
      const pct = (done / movies.length * 100).toFixed(1);
      const rate = done / ((Date.now() - start) / 1000);
      const eta = ((movies.length - done) / rate / 60).toFixed(1);
      process.stdout.write(`\r${pct}% | ${done}/${movies.length} | ${rate.toFixed(1)}/s | ETA: ${eta}m     `);
    } catch (e) {}
  }
  
  console.log('\n\nMovies DONE!');
  
  let sdone = 0;
  const sstart = Date.now();
  
  for (let i = 0; i < series.length; i += BATCH) {
    const batch = series.slice(i, i + BATCH);
    const stmts = batch.map(s => ({ sql: 'UPDATE tv_series SET backdrop_path = ? WHERE tmdb_id = ?', args: [s.backdrop_path, s.tmdb_id] }));
    
    try {
      await turso.batch(stmts, 'write');
      sdone += batch.length;
      const pct = (sdone / series.length * 100).toFixed(1);
      const rate = sdone / ((Date.now() - sstart) / 1000);
      const eta = ((series.length - sdone) / rate / 60).toFixed(1);
      process.stdout.write(`\r${pct}% | ${sdone}/${series.length} | ${rate.toFixed(1)}/s | ETA: ${eta}m     `);
    } catch (e) {}
  }
  
  console.log('\n\nSeries DONE!');
  console.log('Total time:', ((Date.now() - start) / 1000 / 60).toFixed(1), 'min');
  
  const cm = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE backdrop_path IS NOT NULL');
  const cs = await turso.execute('SELECT COUNT(*) as c FROM tv_series WHERE backdrop_path IS NOT NULL');
  console.log('\nTurso:');
  console.log('Movies:', cm.rows[0].c);
  console.log('Series:', cs.rows[0].c);
  
  localDb.close();
}

run().catch(console.error);
