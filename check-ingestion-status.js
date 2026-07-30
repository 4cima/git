const Database = require('better-sqlite3');
const path = require('path');

const localDbPath = path.join(__dirname, 'data', '4cima-local.db');
const localDb = new Database(localDbPath, { readonly: true });

console.log('═'.repeat(80));
console.log('INGESTION PROGRESS STATUS');
console.log('═'.repeat(80));
console.log('');

// Get ingestion progress
const progress = localDb.prepare('SELECT * FROM ingestion_progress').all();

console.log('Ingestion Progress Table:');
console.log('─'.repeat(80));
progress.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});
console.log('');

// Get current counts
const movieCount = localDb.prepare('SELECT COUNT(*) as total FROM movies').get();
const seriesCount = localDb.prepare('SELECT COUNT(*) as total FROM tv_series').get();

console.log('Current Database Counts:');
console.log(`  Movies: ${movieCount.total.toLocaleString('en-US')}`);
console.log(`  TV Series: ${seriesCount.total.toLocaleString('en-US')}`);
console.log('');

// Get max tmdb_ids
const maxMovieId = localDb.prepare('SELECT MAX(tmdb_id) as max_id FROM movies').get();
const maxSeriesId = localDb.prepare('SELECT MAX(tmdb_id) as max_id FROM tv_series').get();

console.log('Max TMDB IDs in Database:');
console.log(`  Movies: ${maxMovieId.max_id}`);
console.log(`  TV Series: ${maxSeriesId.max_id}`);
console.log('');

localDb.close();
