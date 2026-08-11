#!/usr/bin/env node
/**
 * Filter local SQLite database to remove news, talk, documentary, reality
 * (ONLY-genre matches) so sync script won't re-pull this content
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'local.db');
const db = new Database(dbPath);

console.log('🗑️  Filtering local SQLite database\n');
console.log('Removing: news, talk, documentary, reality (ONLY-genre matches)\n');

const TARGET_GENRES = [
  { name: 'News', slug: 'news' },
  { name: 'Talk', slug: 'talk' },
  { name: 'Documentary', slug: 'documentary' },
  { name: 'Reality', slug: 'reality' },
];

// Get counts before
const beforeMovies = db.prepare('SELECT COUNT(*) as count FROM movies').get().count;
const beforeSeries = db.prepare('SELECT COUNT(*) as count FROM tv_series').get().count;

console.log('Current local database size:');
console.log(`  Movies: ${beforeMovies.toLocaleString()}`);
console.log(`  Series: ${beforeSeries.toLocaleString()}`);
console.log(`  Total: ${(beforeMovies + beforeSeries).toLocaleString()}\n`);

let totalDeleted = { movies: 0, series: 0 };

for (const genre of TARGET_GENRES) {
  // Movies
  const moviesResult = db.prepare(`
    DELETE FROM movies
    WHERE tmdb_id IN (
      SELECT m.tmdb_id
      FROM movies m
      JOIN content_genres cg ON m.id = cg.content_id
      JOIN genres g ON cg.genre_id = g.id
      WHERE cg.content_type = 'movie'
      AND g.slug = ?
      GROUP BY m.id
      HAVING COUNT(DISTINCT g.id) = 1
    )
  `).run(genre.slug);
  
  if (moviesResult.changes > 0) {
    console.log(`${genre.name}: Deleted ${moviesResult.changes} movies`);
    totalDeleted.movies += moviesResult.changes;
  }

  // Series
  const seriesResult = db.prepare(`
    DELETE FROM tv_series
    WHERE tmdb_id IN (
      SELECT s.tmdb_id
      FROM tv_series s
      JOIN content_genres cg ON s.id = cg.content_id
      JOIN genres g ON cg.genre_id = g.id
      WHERE cg.content_type = 'series'
      AND g.slug = ?
      GROUP BY s.id
      HAVING COUNT(DISTINCT g.id) = 1
    )
  `).run(genre.slug);
  
  if (seriesResult.changes > 0) {
    console.log(`${genre.name}: Deleted ${seriesResult.changes} series`);
    totalDeleted.series += seriesResult.changes;
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Total deleted from local database:');
console.log(`  Movies: ${totalDeleted.movies.toLocaleString()}`);
console.log(`  Series: ${totalDeleted.series.toLocaleString()}`);
console.log(`  Total: ${(totalDeleted.movies + totalDeleted.series).toLocaleString()}`);

// Get counts after
const afterMovies = db.prepare('SELECT COUNT(*) as count FROM movies').get().count;
const afterSeries = db.prepare('SELECT COUNT(*) as count FROM tv_series').get().count;

console.log('\nFinal local database size:');
console.log(`  Movies: ${afterMovies.toLocaleString()}`);
console.log(`  Series: ${afterSeries.toLocaleString()}`);
console.log(`  Total: ${(afterMovies + afterSeries).toLocaleString()}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Clean up orphaned content_genres records
const orphanedGenres = db.prepare(`
  DELETE FROM content_genres
  WHERE (content_type = 'movie' AND content_id NOT IN (SELECT id FROM movies))
     OR (content_type = 'series' AND content_id NOT IN (SELECT id FROM tv_series))
`).run();

if (orphanedGenres.changes > 0) {
  console.log(`✅ Cleaned up ${orphanedGenres.changes} orphaned content_genres records\n`);
}

db.close();

console.log('✅ Local database filtering complete!');
