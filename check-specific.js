require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // فحص الفيلم بـ id = 1730915
  console.log('=== Turso: ID = 1730915 ===');
  const byId = await turso.execute('SELECT id, tmdb_id, title_en, title_ar FROM movies WHERE id = 1730915');
  if (byId.rows.length > 0) {
    const m = byId.rows[0];
    console.log('ID:', m.id);
    console.log('TMDB_ID:', m.tmdb_id);
    console.log('Title EN:', m.title_en);
    console.log('Title AR:', m.title_ar);
  } else {
    console.log('لا يوجد فيلم بهذا ID');
  }
  
  console.log('\n=== Turso: TMDB_ID = 1236814 ===');
  const byTmdb = await turso.execute('SELECT id, tmdb_id, title_en, title_ar FROM movies WHERE tmdb_id = 1236814');
  if (byTmdb.rows.length > 0) {
    const m = byTmdb.rows[0];
    console.log('ID:', m.id);
    console.log('TMDB_ID:', m.tmdb_id);
    console.log('Title EN:', m.title_en);
    console.log('Title AR:', m.title_ar);
  } else {
    console.log('لا يوجد فيلم بهذا TMDB_ID');
  }
  
  // فحص كم سجل في القاعدة المحلية حيث id != tmdb_id
  const db = require('./scripts/services/local-db');
  const mismatch = db.prepare('SELECT COUNT(*) as c FROM movies WHERE id != tmdb_id').get();
  console.log('\n=== القاعدة المحلية ===');
  console.log('عدد السجلات حيث id != tmdb_id:', mismatch.c);
  
  const samples = db.prepare('SELECT id, tmdb_id, title_en FROM movies WHERE id != tmdb_id LIMIT 5').all();
  console.log('\nأمثلة:');
  samples.forEach(s => {
    console.log(`- ID: ${s.id} vs TMDB_ID: ${s.tmdb_id} | ${s.title_en}`);
  });
}

main().catch(console.error);
