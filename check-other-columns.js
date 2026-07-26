const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const result = await turso.execute(`
    SELECT genres_json, cast_json, countries_json, seo_title_ar, canonical_url
    FROM movies 
    WHERE tmdb_id IN (2,3,5,11,12)
  `);
  
  console.log('\n=== OTHER COLUMNS CHECK ===\n');
  console.log(JSON.stringify(result.rows, null, 2));
}

check().catch(console.error);
