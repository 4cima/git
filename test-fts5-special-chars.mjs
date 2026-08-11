import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const terms = ['Spider-Man', "It's", 'IT', 'V', '9-1-1'];

async function test(term) {
  try {
    const r = await turso.execute({
      sql: `SELECT movies.title_en FROM movies
            JOIN movies_fts ON movies.id = movies_fts.rowid
            WHERE movies_fts MATCH ? LIMIT 3`,
      args: [term]
    });
    console.log(`${term}: ${r.rows.length} results - ${r.rows.map(x => x.title_en).join(', ')}`);
  } catch (e) {
    console.log(`${term}: ERROR - ${e.message}`);
  }
}

for (const term of terms) {
  await test(term);
}

process.exit(0);
