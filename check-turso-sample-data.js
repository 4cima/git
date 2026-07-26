const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function checkSampleData() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('\n=== SAMPLE DATA FROM TURSO movies (First 5 rows) ===\n');
  
  const result = await turso.execute(`
    SELECT id, tmdb_id, title_en, backdrop_path, vote_count, popularity, runtime, 
           keywords_json, companies_json, created_at, updated_at
    FROM movies 
    LIMIT 5
  `);
  
  console.log('RAW OUTPUT:');
  console.log(JSON.stringify(result.rows, null, 2));
}

checkSampleData().catch(console.error);
