#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  const sample = await turso.execute({
    sql: 'SELECT id, tmdb_id, title_en, created_at FROM movies ORDER BY id LIMIT 5',
    args: []
  });
  
  console.log('🗄️  أول 5 صفوف من Turso (created_at):');
  for (const row of sample.rows) {
    console.log(`[${row.id}] ${row.title_en}`);
    console.log(`    created_at: ${row.created_at}`);
  }
}

main().catch(console.error);
