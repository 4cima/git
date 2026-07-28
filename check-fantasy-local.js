const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', '4cima-local.db');
const db = new Database(dbPath, { readonly: true });

try {
  console.log('Checking Fantasy genre in local database...\n');

  // Check genres table for Fantasy
  const fantasyGenre = db.prepare(`
    SELECT * FROM genres WHERE name_en = 'Fantasy'
  `).get();

  console.log('Fantasy genre in genres table:');
  console.log(fantasyGenre);
  console.log('');

  if (fantasyGenre) {
    // Count movies with this genre
    const movieCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM content_genres 
      WHERE genre_tmdb_id = ? AND content_type = 'movie'
    `).get(fantasyGenre.tmdb_id);

    // Count series with this genre
    const seriesCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM content_genres 
      WHERE genre_tmdb_id = ? AND content_type = 'tv'
    `).get(fantasyGenre.tmdb_id);

    console.log('═'.repeat(70));
    console.log(`Fantasy Genre TMDB ID: ${fantasyGenre.tmdb_id}`);
    console.log(`English Name: ${fantasyGenre.name_en}`);
    console.log(`Arabic Name: ${fantasyGenre.name_ar}`);
    console.log('═'.repeat(70));
    console.log(`Movies with Fantasy genre: ${movieCount.count.toLocaleString()}`);
    console.log(`Series with Fantasy genre: ${seriesCount.count.toLocaleString()}`);
    console.log('═'.repeat(70));

    // Sample movies
    if (movieCount.count > 0) {
      console.log('\nSample movies with Fantasy genre:');
      const sampleMovies = db.prepare(`
        SELECT m.tmdb_id, m.title_ar, m.title_en
        FROM movies m
        INNER JOIN content_genres cg ON m.tmdb_id = cg.content_tmdb_id
        WHERE cg.genre_tmdb_id = ? AND cg.content_type = 'movie'
        LIMIT 5
      `).all(fantasyGenre.tmdb_id);

      sampleMovies.forEach(movie => {
        console.log(`  [${movie.tmdb_id}] ${movie.title_ar || movie.title_en}`);
      });
    }

    // Sample series
    if (seriesCount.count > 0) {
      console.log('\nSample series with Fantasy genre:');
      const sampleSeries = db.prepare(`
        SELECT s.tmdb_id, s.name_ar, s.name_en
        FROM tv_series s
        INNER JOIN content_genres cg ON s.tmdb_id = cg.content_tmdb_id
        WHERE cg.genre_tmdb_id = ? AND cg.content_type = 'tv'
        LIMIT 5
      `).all(fantasyGenre.tmdb_id);

      sampleSeries.forEach(series => {
        console.log(`  [${series.tmdb_id}] ${series.name_ar || series.name_en}`);
      });
    }
  }

} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
