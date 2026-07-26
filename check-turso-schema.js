const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('\n=== TURSO SCHEMA: movies ===\n');
  const moviesSchema = await turso.execute('PRAGMA table_info(movies)');
  console.log('RAW OUTPUT:');
  console.log(JSON.stringify(moviesSchema.rows, null, 2));
  
  console.log('\n=== FORMATTED: movies columns ===');
  moviesSchema.rows.forEach(row => {
    console.log(`${row.cid}: ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  console.log('\n=== TURSO SCHEMA: tv_series ===\n');
  const seriesSchema = await turso.execute('PRAGMA table_info(tv_series)');
  console.log('RAW OUTPUT:');
  console.log(JSON.stringify(seriesSchema.rows, null, 2));
  
  console.log('\n=== FORMATTED: tv_series columns ===');
  seriesSchema.rows.forEach(row => {
    console.log(`${row.cid}: ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
  });
}

checkSchema().catch(console.error);
