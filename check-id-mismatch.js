const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('\n=== CRITICAL CHECK: id vs tmdb_id ===\n');
  
  const mismatch = await turso.execute('SELECT COUNT(*) as mismatched FROM movies WHERE id != tmdb_id');
  const total = await turso.execute('SELECT COUNT(*) as total FROM movies');
  
  console.log('Mismatched rows:', mismatch.rows[0].mismatched);
  console.log('Total rows:', total.rows[0].total);
  console.log('Percentage:', ((Number(mismatch.rows[0].mismatched) / Number(total.rows[0].total)) * 100).toFixed(2) + '%');
  
  console.log('\n=== Last 10 rows (DESC by id) ===\n');
  const last10 = await turso.execute('SELECT id, tmdb_id, title_en FROM movies ORDER BY id DESC LIMIT 10');
  console.log(JSON.stringify(last10.rows, null, 2));
}

check().catch(console.error);
