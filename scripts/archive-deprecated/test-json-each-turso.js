const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function testJsonEach() {
  console.log('🔍 Testing json_each() + json_extract() + CAST on Turso...\n');
  
  try {
    const result = await turso.execute({
      sql: `
        SELECT tmdb_id, title_ar 
        FROM movies 
        WHERE EXISTS (
          SELECT 1 FROM json_each(genres_json)
          WHERE CAST(json_extract(value, '$.id') AS INTEGER) = 28
        ) 
        LIMIT 5
      `,
      args: []
    });
    
    console.log('✅ Query executed successfully!\n');
    console.log('📊 Results:');
    console.log('Total rows returned:', result.rows.length);
    console.log('\nFirst 5 movies with Action genre (id=28):');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check if The Dark Knight (tmdb_id=155) is in results
    const darkKnight = result.rows.find(row => row.tmdb_id === 155);
    if (darkKnight) {
      console.log('\n🎬 The Dark Knight found:', darkKnight.title_ar);
    }
    
  } catch (error) {
    console.error('❌ Query failed with error:\n');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('\nFull error object:', JSON.stringify(error, null, 2));
  } finally {
    turso.close();
  }
}

testJsonEach();
