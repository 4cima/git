const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function testDarkKnight() {
  console.log('🔍 Testing if The Dark Knight (tmdb_id=155) has Action genre...\n');
  
  try {
    // First, check if The Dark Knight exists and get its genres_json
    const movie = await turso.execute({
      sql: 'SELECT tmdb_id, title_ar, genres_json FROM movies WHERE tmdb_id = 155',
      args: []
    });
    
    if (movie.rows.length === 0) {
      console.log('⚠️ The Dark Knight (tmdb_id=155) not found in Turso');
      return;
    }
    
    console.log('Movie found:', movie.rows[0].title_ar);
    console.log('genres_json:', movie.rows[0].genres_json);
    
    // Now test the json_each query
    const result = await turso.execute({
      sql: `
        SELECT tmdb_id, title_ar 
        FROM movies 
        WHERE tmdb_id = 155
        AND EXISTS (
          SELECT 1 FROM json_each(genres_json)
          WHERE CAST(json_extract(value, '$.id') AS INTEGER) = 28
        )
      `,
      args: []
    });
    
    console.log('\n✅ Query result:', result.rows.length > 0 ? 'MATCH FOUND' : 'NO MATCH');
    if (result.rows.length > 0) {
      console.log('The Dark Knight correctly filtered by Action genre!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    turso.close();
  }
}

testDarkKnight();
