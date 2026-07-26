const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const localDb = new Database('./data/4cima-local.db');
const BATCH = 200;

async function update(table, items, label) {
  console.log(`\n-Raw{label}: -Raw{items.length.toLocaleString()}`);
  let done = 0;
  const start = Date.now();
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const stmts = batch.map(item => ({ sql: `UPDATE -Raw{table} SET backdrop_path = ? WHERE tmdb_id = ?`, args: [item.backdrop_path, item.tmdb_id] }));
    try {
      await turso.batch(stmts, 'write');
      done += batch.length;
      const pct = (done / items.length * 100).toFixed(1);
      const rate = (done / ((Date.now() - start) / 1000)).toFixed(0);
      const eta = ((items.length - done) / rate / 60).toFixed(1);
      process.stdout.write(`\r  -Raw{pct}% | -Raw{done.toLocaleString()}/-Raw{items.length.toLocaleString()} | -Raw{rate}/s | -Raw{eta}m   `);
    } catch (e) { console.error(`\nError: -Raw{e.message}`); }
  }
  console.log(`\n✅ Done`);
}

async function main() {
  console.log('UPDATE backdrop_path\n');
  const m = localDb.prepare('SELECT tmdb_id, backdrop_path FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != \"\"').all();
  const s = localDb.prepare('SELECT tmdb_id, backdrop_path FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != \"\"').all();
  console.log('LOCAL:', m.length, 'movies,', s.length, 'series');
  if (m.length > 0) await update('movies', m, '🎬 MOVIES');
  if (s.length > 0) await update('tv_series', s, '📺 SERIES');
  const checkM = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE backdrop_path IS NOT NULL');
  const checkS = await turso.execute('SELECT COUNT(*) as c FROM tv_series WHERE backdrop_path IS NOT NULL');
  console.log('\nTURSO:', checkM.rows[0].c.toLocaleString(), 'movies,', checkS.rows[0].c.toLocaleString(), 'series');
  localDb.close();
}
main().catch(e => { console.error('ERROR:', e.message); localDb.close(); process.exit(1); });