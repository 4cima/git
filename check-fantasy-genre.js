const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', '4cima-local.db');
const db = new Database(dbPath, { readonly: true });

try {
  console.log('Checking Fantasy genre translations in local database...\n');

  // Count movies with "خيال" in genres_json
  const khayalCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM movies 
    WHERE genres_json LIKE '%خيال%'
  `).get();

  // Count movies with "فانتازيا" in genres_json
  const fantasyCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM movies 
    WHERE genres_json LIKE '%فانتازيا%'
  `).get();

  // Count total movies
  const totalMovies = db.prepare(`
    SELECT COUNT(*) as count FROM movies
  `).get();

  console.log('='.repeat(60));
  console.log('FANTASY GENRE ANALYSIS');
  console.log('='.repeat(60));
  console.log(`Total movies in database: ${totalMovies.count}`);
  console.log(`Movies with "خيال": ${khayalCount.count}`);
  console.log(`Movies with "فانتازيا": ${fantasyCount.count}`);
  console.log('='.repeat(60));

  // Get some sample movies with "خيال"
  if (khayalCount.count > 0) {
    console.log('\nSample movies with "خيال":');
    const khayalSamples = db.prepare(`
      SELECT id, title_ar, title_en, genres_json 
      FROM movies 
      WHERE genres_json LIKE '%خيال%'
      LIMIT 5
    `).all();
    
    khayalSamples.forEach(movie => {
      console.log(`- [${movie.id}] ${movie.title_ar || movie.title_en}`);
      console.log(`  Genres: ${movie.genres_json}`);
    });
  }

  // Get some sample movies with "فانتازيا"
  if (fantasyCount.count > 0) {
    console.log('\nSample movies with "فانتازيا":');
    const fantasySamples = db.prepare(`
      SELECT id, title_ar, title_en, genres_json 
      FROM movies 
      WHERE genres_json LIKE '%فانتازيا%'
      LIMIT 5
    `).all();
    
    fantasySamples.forEach(movie => {
      console.log(`- [${movie.id}] ${movie.title_ar || movie.title_en}`);
      console.log(`  Genres: ${movie.genres_json}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('CONCLUSION:');
  if (khayalCount.count > 0 && fantasyCount.count === 0) {
    console.log('✓ All Fantasy movies use "خيال" (consistent)');
  } else if (khayalCount.count === 0 && fantasyCount.count > 0) {
    console.log('✓ All Fantasy movies use "فانتازيا" (consistent)');
  } else if (khayalCount.count > 0 && fantasyCount.count > 0) {
    console.log('✗ INCONSISTENT: Both "خيال" and "فانتازيا" are present');
  } else {
    console.log('No Fantasy genre movies found in database');
  }
  console.log('='.repeat(60));

} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
