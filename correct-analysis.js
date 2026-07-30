const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
const path = require('path');

const localDbPath = path.join(__dirname, 'data', '4cima-local.db');
const localDb = new Database(localDbPath, { readonly: true });

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('═'.repeat(80));
  console.log('CORRECT ANALYSIS - RAW RESULTS');
  console.log('═'.repeat(80));
  console.log('');

  try {
    // 1) حالة الـ ingestion للأفلام
    console.log('## 1) MOVIES - INGESTION STATUS (LOCAL DB)');
    console.log('─'.repeat(80));
    
    const moviesStatus = localDb.prepare(`
      SELECT 
        COUNT(*) as total_rows,
        SUM(CASE WHEN is_fetched = 1 THEN 1 ELSE 0 END) as fetched,
        SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as complete,
        SUM(CASE WHEN synced_to_turso = 1 THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN is_filtered = 1 THEN 1 ELSE 0 END) as filtered_out,
        SUM(CASE WHEN filter_status = 'blocked' THEN 1 ELSE 0 END) as blocked
      FROM movies
    `).get();
    
    console.log('Movies (Local):');
    console.log(JSON.stringify(moviesStatus, null, 2));
    console.log('');

    // حالة الـ ingestion للمسلسلات
    console.log('## TV_SERIES - INGESTION STATUS (LOCAL DB)');
    console.log('─'.repeat(80));
    
    const seriesStatus = localDb.prepare(`
      SELECT 
        COUNT(*) as total_rows,
        SUM(CASE WHEN is_fetched = 1 THEN 1 ELSE 0 END) as fetched,
        SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as complete,
        SUM(CASE WHEN synced_to_turso = 1 THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN is_filtered = 1 THEN 1 ELSE 0 END) as filtered_out,
        SUM(CASE WHEN filter_status = 'blocked' THEN 1 ELSE 0 END) as blocked
      FROM tv_series
    `).get();
    
    console.log('TV Series (Local):');
    console.log(JSON.stringify(seriesStatus, null, 2));
    console.log('');

    // عدد الصفوف في Turso
    console.log('## TURSO - ACTUAL ROW COUNTS');
    console.log('─'.repeat(80));
    
    const tursoMoviesCount = await tursoClient.execute('SELECT COUNT(*) as total FROM movies');
    console.log('Movies (Turso):', tursoMoviesCount.rows[0].total);
    
    const tursoSeriesCount = await tursoClient.execute('SELECT COUNT(*) as total FROM tv_series');
    console.log('TV Series (Turso):', tursoSeriesCount.rows[0].total);
    console.log('');

    // 2) فحص اكتمال أعمدة JSON في Turso
    console.log('\n## 2) JSON COLUMNS COMPLETENESS IN TURSO');
    console.log('─'.repeat(80));
    
    console.log('\nMovies (Turso):');
    const tursoMoviesJson = await tursoClient.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN cast_json IS NULL OR cast_json = '' THEN 1 ELSE 0 END) as empty_cast,
        SUM(CASE WHEN genres_json IS NULL OR genres_json = '' THEN 1 ELSE 0 END) as empty_genres
      FROM movies
    `);
    console.log(JSON.stringify(tursoMoviesJson.rows[0], null, 2));
    console.log('');

    console.log('TV Series (Turso):');
    const tursoSeriesJson = await tursoClient.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN cast_json IS NULL OR cast_json = '' THEN 1 ELSE 0 END) as empty_cast,
        SUM(CASE WHEN genres_json IS NULL OR genres_json = '' THEN 1 ELSE 0 END) as empty_genres,
        SUM(CASE WHEN seasons_json IS NULL OR seasons_json = '' THEN 1 ELSE 0 END) as empty_seasons,
        SUM(CASE WHEN episodes_json IS NULL OR episodes_json = '' THEN 1 ELSE 0 END) as empty_episodes
      FROM tv_series
    `);
    console.log(JSON.stringify(tursoSeriesJson.rows[0], null, 2));
    console.log('');

    // 3) نسب الأعمدة المفقودة على الصفوف المجلوبة فعلياً
    console.log('\n## 3) MISSING COLUMNS ON FETCHED ROWS ONLY (LOCAL DB)');
    console.log('─'.repeat(80));
    
    console.log('\nMovies (WHERE is_fetched = 1):');
    const moviesFetched = localDb.prepare(`
      SELECT 
        COUNT(*) as total_fetched,
        SUM(CASE WHEN age_rating IS NOT NULL AND age_rating != '' THEN 1 ELSE 0 END) as has_age_rating,
        SUM(CASE WHEN imdb_id IS NOT NULL AND imdb_id != '' THEN 1 ELSE 0 END) as has_imdb,
        SUM(CASE WHEN country_of_origin IS NOT NULL AND country_of_origin != '' THEN 1 ELSE 0 END) as has_country
      FROM movies 
      WHERE is_fetched = 1
    `).get();
    console.log(JSON.stringify(moviesFetched, null, 2));
    console.log('');

    console.log('TV Series (WHERE is_fetched = 1):');
    const seriesFetched = localDb.prepare(`
      SELECT 
        COUNT(*) as total_fetched,
        SUM(CASE WHEN age_rating IS NOT NULL AND age_rating != '' THEN 1 ELSE 0 END) as has_age_rating,
        SUM(CASE WHEN imdb_id IS NOT NULL AND imdb_id != '' THEN 1 ELSE 0 END) as has_imdb,
        SUM(CASE WHEN country_of_origin IS NOT NULL AND country_of_origin != '' THEN 1 ELSE 0 END) as has_country
      FROM tv_series 
      WHERE is_fetched = 1
    `).get();
    console.log(JSON.stringify(seriesFetched, null, 2));
    console.log('');

    console.log('═'.repeat(80));
    console.log('RAW RESULTS COMPLETE');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  } finally {
    localDb.close();
    tursoClient.close();
  }
}

main();
