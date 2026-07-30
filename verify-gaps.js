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
  console.log('VERIFICATION QUERIES - RAW RESULTS');
  console.log('═'.repeat(80));
  console.log('');

  try {
    // 1) الفيلمين المفقودين
    console.log('## 1) MOVIES: complete but not synced');
    console.log('─'.repeat(80));
    
    const unsynced = localDb.prepare(`
      SELECT tmdb_id, slug, title_en, is_complete, synced_to_turso, filter_status
      FROM movies 
      WHERE is_complete = 1 AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
    `).all();
    
    console.log(`Found ${unsynced.length} movies:\n`);
    unsynced.forEach(m => {
      console.log(JSON.stringify(m, null, 2));
    });
    console.log('');

    // 2) عينة من المسلسلات في Turso
    console.log('\n## 2) TV SERIES: Sample from Turso (first 10)');
    console.log('─'.repeat(80));
    
    const tursoSeriesSample = await tursoClient.execute(`
      SELECT tmdb_id, slug, created_at, updated_at
      FROM tv_series
      ORDER BY tmdb_id
      LIMIT 10
    `);
    
    console.log('Turso sample (10 series):');
    tursoSeriesSample.rows.forEach(s => {
      console.log(JSON.stringify(s, null, 2));
    });
    
    // الآن نفحص نفس الـ IDs في المحلي
    const tursoIds = tursoSeriesSample.rows.map(r => r.tmdb_id);
    console.log(`\nChecking same IDs in LOCAL database:`);
    console.log(`IDs: ${tursoIds.join(', ')}\n`);
    
    const placeholders = tursoIds.map(() => '?').join(',');
    const localSeriesSample = localDb.prepare(`
      SELECT tmdb_id, slug, is_complete, synced_to_turso, synced_at, filter_status, created_at, updated_at
      FROM tv_series 
      WHERE tmdb_id IN (${placeholders})
    `).all(...tursoIds);
    
    console.log('Local data for same IDs:');
    localSeriesSample.forEach(s => {
      console.log(JSON.stringify(s, null, 2));
    });
    console.log('');

    // 3) نسب الأعمدة على complete فقط
    console.log('\n## 3) MISSING COLUMNS ON COMPLETE ROWS ONLY');
    console.log('─'.repeat(80));
    
    console.log('\nMovies (WHERE is_complete = 1):');
    const moviesComplete = localDb.prepare(`
      SELECT 
        COUNT(*) as total_complete,
        SUM(CASE WHEN age_rating IS NOT NULL AND age_rating != '' THEN 1 ELSE 0 END) as has_age_rating,
        SUM(CASE WHEN imdb_id IS NOT NULL AND imdb_id != '' THEN 1 ELSE 0 END) as has_imdb,
        SUM(CASE WHEN country_of_origin IS NOT NULL AND country_of_origin != '' THEN 1 ELSE 0 END) as has_country
      FROM movies 
      WHERE is_complete = 1
    `).get();
    console.log(JSON.stringify(moviesComplete, null, 2));
    console.log('');

    console.log('TV Series (WHERE is_complete = 1):');
    const seriesComplete = localDb.prepare(`
      SELECT 
        COUNT(*) as total_complete,
        SUM(CASE WHEN age_rating IS NOT NULL AND age_rating != '' THEN 1 ELSE 0 END) as has_age_rating,
        SUM(CASE WHEN imdb_id IS NOT NULL AND imdb_id != '' THEN 1 ELSE 0 END) as has_imdb,
        SUM(CASE WHEN country_of_origin IS NOT NULL AND country_of_origin != '' THEN 1 ELSE 0 END) as has_country
      FROM tv_series 
      WHERE is_complete = 1
    `).get();
    console.log(JSON.stringify(seriesComplete, null, 2));
    console.log('');

    // 5) توزيع filter_status
    console.log('\n## 5) FILTER_STATUS DISTRIBUTION');
    console.log('─'.repeat(80));
    
    console.log('\nMovies:');
    const moviesStatus = localDb.prepare(`
      SELECT filter_status, COUNT(*) as count
      FROM movies
      GROUP BY filter_status
      ORDER BY count DESC
    `).all();
    moviesStatus.forEach(s => {
      console.log(`  ${(s.filter_status || 'NULL').padEnd(20)} ${s.count.toLocaleString('en-US')}`);
    });
    
    console.log('\nTV Series:');
    const seriesStatus = localDb.prepare(`
      SELECT filter_status, COUNT(*) as count
      FROM tv_series
      GROUP BY filter_status
      ORDER BY count DESC
    `).all();
    seriesStatus.forEach(s => {
      console.log(`  ${(s.filter_status || 'NULL').padEnd(20)} ${s.count.toLocaleString('en-US')}`);
    });
    
    console.log('\n═'.repeat(80));
    console.log('QUERIES COMPLETE');
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
