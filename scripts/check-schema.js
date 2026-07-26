const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    const movies = await db.execute('PRAGMA table_info(movies)');
    console.log("Movies columns:", movies.rows.map(r => r.name).join(', '));
    const series = await db.execute('PRAGMA table_info(tv_series)');
    console.log("Series columns:", series.rows.map(r => r.name).join(', '));
  } catch (err) {
    console.error(err);
  }
}
checkSchema();