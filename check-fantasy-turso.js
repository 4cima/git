require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 Checking Fantasy genre translations in Turso database...\n');
console.log('═'.repeat(70));

async function main() {
  try {
    // Count movies with "خيال" in genres_json
    const khayalResult = await turso.execute(`
      SELECT COUNT(*) as count 
      FROM movies 
      WHERE genres_json LIKE '%خيال%'
    `);
    const khayalCount = khayalResult.rows[0].count;

    // Count movies with "فانتازيا" in genres_json
    const fantasyResult = await turso.execute(`
      SELECT COUNT(*) as count 
      FROM movies 
      WHERE genres_json LIKE '%فانتازيا%'
    `);
    const fantasyCount = fantasyResult.rows[0].count;

    // Count total movies
    const totalResult = await turso.execute(`
      SELECT COUNT(*) as count FROM movies
    `);
    const totalMovies = totalResult.rows[0].count;

    // Count TV series with "خيال"
    const seriesKhayalResult = await turso.execute(`
      SELECT COUNT(*) as count 
      FROM tv_series 
      WHERE genres_json LIKE '%خيال%'
    `);
    const seriesKhayalCount = seriesKhayalResult.rows[0].count;

    // Count TV series with "فانتازيا"
    const seriesFantasyResult = await turso.execute(`
      SELECT COUNT(*) as count 
      FROM tv_series 
      WHERE genres_json LIKE '%فانتازيا%'
    `);
    const seriesFantasyCount = seriesFantasyResult.rows[0].count;

    // Count total TV series
    const totalSeriesResult = await turso.execute(`
      SELECT COUNT(*) as count FROM tv_series
    `);
    const totalSeries = totalSeriesResult.rows[0].count;

    console.log('📊 MOVIES ANALYSIS:');
    console.log('─'.repeat(70));
    console.log(`   Total movies: ${totalMovies.toLocaleString()}`);
    console.log(`   Movies with "خيال": ${khayalCount.toLocaleString()}`);
    console.log(`   Movies with "فانتازيا": ${fantasyCount.toLocaleString()}`);
    
    console.log('\n📺 TV SERIES ANALYSIS:');
    console.log('─'.repeat(70));
    console.log(`   Total series: ${totalSeries.toLocaleString()}`);
    console.log(`   Series with "خيال": ${seriesKhayalCount.toLocaleString()}`);
    console.log(`   Series with "فانتازيا": ${seriesFantasyCount.toLocaleString()}`);

    // Get sample movies with "خيال"
    if (khayalCount > 0) {
      console.log('\n🎬 Sample movies with "خيال":');
      console.log('─'.repeat(70));
      const khayalSamples = await turso.execute(`
        SELECT id, title_ar, title_en, genres_json 
        FROM movies 
        WHERE genres_json LIKE '%خيال%'
        LIMIT 5
      `);
      
      khayalSamples.rows.forEach(movie => {
        console.log(`   [${movie.id}] ${movie.title_ar || movie.title_en}`);
        console.log(`   Genres: ${movie.genres_json}`);
        console.log('');
      });
    }

    // Get sample movies with "فانتازيا"
    if (fantasyCount > 0) {
      console.log('\n🎬 Sample movies with "فانتازيا":');
      console.log('─'.repeat(70));
      const fantasySamples = await turso.execute(`
        SELECT id, title_ar, title_en, genres_json 
        FROM movies 
        WHERE genres_json LIKE '%فانتازيا%'
        LIMIT 5
      `);
      
      fantasySamples.rows.forEach(movie => {
        console.log(`   [${movie.id}] ${movie.title_ar || movie.title_en}`);
        console.log(`   Genres: ${movie.genres_json}`);
        console.log('');
      });
    }

    // Get sample series with "خيال"
    if (seriesKhayalCount > 0) {
      console.log('\n📺 Sample series with "خيال":');
      console.log('─'.repeat(70));
      const seriesKhayalSamples = await turso.execute(`
        SELECT id, title_ar, title_en, genres_json 
        FROM tv_series 
        WHERE genres_json LIKE '%خيال%'
        LIMIT 5
      `);
      
      seriesKhayalSamples.rows.forEach(series => {
        console.log(`   [${series.id}] ${series.title_ar || series.title_en}`);
        console.log(`   Genres: ${series.genres_json}`);
        console.log('');
      });
    }

    // Get sample series with "فانتازيا"
    if (seriesFantasyCount > 0) {
      console.log('\n📺 Sample series with "فانتازيا":');
      console.log('─'.repeat(70));
      const seriesFantasySamples = await turso.execute(`
        SELECT id, title_ar, title_en, genres_json 
        FROM tv_series 
        WHERE genres_json LIKE '%فانتازيا%'
        LIMIT 5
      `);
      
      seriesFantasySamples.rows.forEach(series => {
        console.log(`   [${series.id}] ${series.title_ar || series.title_en}`);
        console.log(`   Genres: ${series.genres_json}`);
        console.log('');
      });
    }

    console.log('═'.repeat(70));
    console.log('📋 CONCLUSION:');
    console.log('─'.repeat(70));
    
    const totalKhayal = khayalCount + seriesKhayalCount;
    const totalFantasy = fantasyCount + seriesFantasyCount;
    
    if (totalKhayal > 0 && totalFantasy === 0) {
      console.log('✅ All Fantasy content uses "خيال" (CONSISTENT)');
    } else if (totalKhayal === 0 && totalFantasy > 0) {
      console.log('✅ All Fantasy content uses "فانتازيا" (CONSISTENT)');
    } else if (totalKhayal > 0 && totalFantasy > 0) {
      console.log('❌ INCONSISTENT: Both "خيال" and "فانتازيا" are present in database');
      console.log(`   Total with "خيال": ${totalKhayal.toLocaleString()}`);
      console.log(`   Total with "فانتازيا": ${totalFantasy.toLocaleString()}`);
    } else {
      console.log('ℹ️  No Fantasy genre content found in database');
    }
    console.log('═'.repeat(70));

    process.exit(0);
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  }
}

main();
