const Database = require('better-sqlite3');
const path = require('path');

const localDbPath = path.join(__dirname, 'data', '4cima-local.db');
const localDb = new Database(localDbPath, { readonly: true });

console.log('═'.repeat(80));
console.log('TMDB ID ANALYSIS');
console.log('═'.repeat(80));
console.log('');

// Get ingestion progress
const progress = localDb.prepare('SELECT * FROM ingestion_progress').get();
console.log('Ingestion Progress:');
console.log(`  Script: ${progress.script_name}`);
console.log(`  Last Processed TMDB ID: ${progress.last_processed_tmdb_id.toLocaleString('en-US')}`);
console.log(`  Status: ${progress.status}`);
console.log(`  Last Run: ${progress.last_run}`);
console.log('');

// Movies analysis
console.log('MOVIES Analysis:');
console.log('─'.repeat(80));
const movieStats = localDb.prepare(`
  SELECT 
    MIN(tmdb_id) as min_id,
    MAX(tmdb_id) as max_id,
    COUNT(*) as total,
    COUNT(DISTINCT tmdb_id) as unique_ids
  FROM movies
`).get();

console.log(`  Min TMDB ID: ${movieStats.min_id.toLocaleString('en-US')}`);
console.log(`  Max TMDB ID: ${movieStats.max_id.toLocaleString('en-US')}`);
console.log(`  Total Rows: ${movieStats.total.toLocaleString('en-US')}`);
console.log(`  Unique IDs: ${movieStats.unique_ids.toLocaleString('en-US')}`);
console.log(`  ID Range: ${(movieStats.max_id - movieStats.min_id + 1).toLocaleString('en-US')}`);
console.log(`  Coverage: ${((movieStats.total / (movieStats.max_id - movieStats.min_id + 1)) * 100).toFixed(2)}%`);
console.log('');

// Check some high ID movies
const highIdMovies = localDb.prepare(`
  SELECT tmdb_id, title_en, is_fetched, is_complete, filter_status
  FROM movies
  WHERE tmdb_id > 1700000
  ORDER BY tmdb_id DESC
  LIMIT 10
`).all();

console.log('Sample of HIGH ID movies (> 1,700,000):');
highIdMovies.forEach(m => {
  console.log(`  ${m.tmdb_id}: ${m.title_en || 'N/A'} | fetched:${m.is_fetched} complete:${m.is_complete} status:${m.filter_status}`);
});
console.log('');

// TV Series analysis
console.log('TV SERIES Analysis:');
console.log('─'.repeat(80));
const seriesStats = localDb.prepare(`
  SELECT 
    MIN(tmdb_id) as min_id,
    MAX(tmdb_id) as max_id,
    COUNT(*) as total,
    COUNT(DISTINCT tmdb_id) as unique_ids
  FROM tv_series
`).get();

console.log(`  Min TMDB ID: ${seriesStats.min_id.toLocaleString('en-US')}`);
console.log(`  Max TMDB ID: ${seriesStats.max_id.toLocaleString('en-US')}`);
console.log(`  Total Rows: ${seriesStats.total.toLocaleString('en-US')}`);
console.log(`  Unique IDs: ${seriesStats.unique_ids.toLocaleString('en-US')}`);
console.log(`  ID Range: ${(seriesStats.max_id - seriesStats.min_id + 1).toLocaleString('en-US')}`);
console.log(`  Coverage: ${((seriesStats.total / (seriesStats.max_id - seriesStats.min_id + 1)) * 100).toFixed(2)}%`);
console.log('');

// Check relationship with ingestion_progress
console.log('Relationship Check:');
console.log('─'.repeat(80));
if (progress.last_processed_tmdb_id <= seriesStats.max_id) {
  console.log(`  ✅ last_processed_tmdb_id (${progress.last_processed_tmdb_id.toLocaleString('en-US')}) is within TV series range`);
  console.log(`     This suggests ingestion_progress tracks TV series, not movies`);
} else {
  console.log(`  ⚠️  last_processed_tmdb_id is outside both ranges`);
}
console.log('');

// Check if movies go beyond ingestion_progress
const moviesAboveProgress = localDb.prepare(`
  SELECT COUNT(*) as count
  FROM movies
  WHERE tmdb_id > ?
`).get(progress.last_processed_tmdb_id);

console.log(`Movies with tmdb_id > last_processed_tmdb_id: ${moviesAboveProgress.count.toLocaleString('en-US')}`);
console.log('');

// Check series near the last_processed_tmdb_id
const seriesNearProgress = localDb.prepare(`
  SELECT tmdb_id, name_en, is_fetched, is_complete
  FROM tv_series
  WHERE tmdb_id BETWEEN ? AND ?
  ORDER BY tmdb_id
  LIMIT 10
`).all(progress.last_processed_tmdb_id - 5, progress.last_processed_tmdb_id + 5);

console.log(`TV Series near last_processed_tmdb_id (${progress.last_processed_tmdb_id}):`);
seriesNearProgress.forEach(s => {
  console.log(`  ${s.tmdb_id}: ${s.name_en || 'N/A'} | fetched:${s.is_fetched} complete:${s.is_complete}`);
});

console.log('');
console.log('═'.repeat(80));
console.log('CONCLUSION');
console.log('═'.repeat(80));
console.log('');

if (movieStats.max_id > 1700000) {
  console.log('✅ Movies: Fetching appears COMPLETE');
  console.log(`   Max ID (${movieStats.max_id.toLocaleString('en-US')}) is at recent TMDB range`);
} else {
  console.log('⚠️  Movies: May be incomplete');
}

if (seriesStats.max_id === progress.last_processed_tmdb_id) {
  console.log('✅ TV Series: ingestion_progress matches max_id exactly');
  console.log('   Fetching appears COMPLETE up to this ID');
} else if (seriesStats.max_id > progress.last_processed_tmdb_id) {
  console.log('⚠️  TV Series: max_id is HIGHER than last_processed_tmdb_id');
  console.log('   This suggests multiple sources or incomplete tracking');
}

localDb.close();
