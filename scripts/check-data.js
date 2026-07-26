const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function checkData() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    console.log('--- MOVIES ---');
    const movies = await db.execute('SELECT id, tmdb_id, slug, title_ar, poster_path, release_year, vote_average FROM movies ORDER BY id DESC LIMIT 5');
    console.log(movies.rows);

    console.log('--- TV SERIES ---');
    const series = await db.execute('SELECT id, tmdb_id, slug, name_ar, poster_path, first_air_year, vote_average FROM tv_series ORDER BY id DESC LIMIT 5');
    console.log(series.rows);
  } catch (err) {
    console.error(err);
  }
}

checkData();
