const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function checkData() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    const series = await db.execute(`
      SELECT id, tmdb_id, slug, name_ar, poster_path, first_air_year, vote_average 
      FROM tv_series 
      WHERE poster_path IS NOT NULL 
        AND poster_path != ''
        AND first_air_year >= 2020 
      ORDER BY id DESC LIMIT 5
    `);
    console.log(series.rows);
  } catch (err) {
    console.error(err);
  }
}

checkData();