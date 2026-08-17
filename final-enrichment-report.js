const db = require('./scripts/services/local-db');

console.log('═══════════════════════════════════════════════════════');
console.log('🎯 FINAL ENRICHMENT REPORT - DIRECT DATABASE QUERIES');
console.log('═══════════════════════════════════════════════════════\n');

// ═══ MOVIES ═══
console.log('━━━ MOVIES ━━━\n');

const movieStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN is_fetched=1 AND is_filtered=0 THEN 1 ELSE 0 END) as enriched,
    SUM(CASE WHEN is_filtered=1 THEN 1 ELSE 0 END) as filtered,
    SUM(CASE WHEN is_complete=1 THEN 1 ELSE 0 END) as complete,
    SUM(CASE WHEN is_fetched=0 AND is_filtered=0 THEN 1 ELSE 0 END) as unfetched
  FROM movies
`).get();

console.log('Total movies:         ', movieStats.total.toLocaleString());
console.log('Enriched (fetched):   ', movieStats.enriched.toLocaleString());
console.log('Filtered:             ', movieStats.filtered.toLocaleString());
console.log('Complete:             ', movieStats.complete.toLocaleString());
console.log('Unfetched:            ', movieStats.unfetched.toLocaleString());

// Check filter reasons
const movieFilterReasons = db.prepare(`
  SELECT filter_reason, COUNT(*) as count
  FROM movies
  WHERE is_filtered=1
  GROUP BY filter_reason
  ORDER BY count DESC
  LIMIT 10
`).all();

console.log('\nTop filter reasons:');
movieFilterReasons.forEach(r => {
  console.log(`  ${r.filter_reason || 'NULL'}: ${r.count.toLocaleString()}`);
});

// ═══ SERIES ═══
console.log('\n━━━ SERIES ━━━\n');

const seriesStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN is_fetched=1 AND is_filtered=0 THEN 1 ELSE 0 END) as enriched,
    SUM(CASE WHEN is_filtered=1 THEN 1 ELSE 0 END) as filtered,
    SUM(CASE WHEN is_complete=1 THEN 1 ELSE 0 END) as complete,
    SUM(CASE WHEN is_fetched=0 AND is_filtered=0 THEN 1 ELSE 0 END) as unfetched
  FROM tv_series
`).get();

console.log('Total series:         ', seriesStats.total.toLocaleString());
console.log('Enriched (fetched):   ', seriesStats.enriched.toLocaleString());
console.log('Filtered:             ', seriesStats.filtered.toLocaleString());
console.log('Complete:             ', seriesStats.complete.toLocaleString());
console.log('Unfetched:            ', seriesStats.unfetched.toLocaleString());

// Check filter reasons
const seriesFilterReasons = db.prepare(`
  SELECT filter_reason, COUNT(*) as count
  FROM tv_series
  WHERE is_filtered=1
  GROUP BY filter_reason
  ORDER BY count DESC
  LIMIT 10
`).all();

console.log('\nTop filter reasons:');
seriesFilterReasons.forEach(r => {
  console.log(`  ${r.filter_reason || 'NULL'}: ${r.count.toLocaleString()}`);
});

// ═══ RELATED TABLES ═══
console.log('\n━━━ RELATED DATA ━━━\n');

const seasons = db.prepare('SELECT COUNT(*) as c FROM seasons').get();
const people = db.prepare('SELECT COUNT(*) as c FROM people').get();
const castCrew = db.prepare('SELECT COUNT(*) as c FROM cast_crew').get();
const genres = db.prepare('SELECT COUNT(*) as c FROM content_genres').get();

console.log('Total seasons:        ', seasons.c.toLocaleString());
console.log('Total people:         ', people.c.toLocaleString());
console.log('Total cast/crew:      ', castCrew.c.toLocaleString());
console.log('Total genre links:    ', genres.c.toLocaleString());

// ═══ INGESTION PROGRESS TABLE ═══
console.log('\n━━━ INGESTION PROGRESS (from progress table) ━━━\n');

const movieProgress = db.prepare(`
  SELECT * FROM ingestion_progress WHERE script_name = 'INGEST-MOVIES'
`).get();

const seriesProgress = db.prepare(`
  SELECT * FROM ingestion_progress WHERE script_name = 'INGEST-SERIES'
`).get();

if (movieProgress) {
  console.log('Movies script:');
  console.log(`  Last run:           ${movieProgress.last_run}`);
  console.log(`  Total fetched:      ${movieProgress.total_fetched?.toLocaleString() || 'N/A'}`);
  console.log(`  Total filtered:     ${movieProgress.total_filtered?.toLocaleString() || 'N/A'}`);
  console.log(`  Total not found:    ${movieProgress.total_not_found?.toLocaleString() || 'N/A'}`);
  console.log(`  Total errors:       ${movieProgress.total_errors?.toLocaleString() || 'N/A'}`);
  console.log(`  Rate per minute:    ${movieProgress.rate_per_minute?.toFixed(0) || 'N/A'}`);
  console.log(`  Status:             ${movieProgress.status}`);
}

if (seriesProgress) {
  console.log('\nSeries script:');
  console.log(`  Last run:           ${seriesProgress.last_run}`);
  console.log(`  Total fetched:      ${seriesProgress.total_fetched?.toLocaleString() || 'N/A'}`);
  console.log(`  Total filtered:     ${seriesProgress.total_filtered?.toLocaleString() || 'N/A'}`);
  console.log(`  Total not found:    ${seriesProgress.total_not_found?.toLocaleString() || 'N/A'}`);
  console.log(`  Total errors:       ${seriesProgress.total_errors?.toLocaleString() || 'N/A'}`);
  console.log(`  Rate per minute:    ${seriesProgress.rate_per_minute?.toFixed(0) || 'N/A'}`);
  console.log(`  Status:             ${seriesProgress.status}`);
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ ENRICHMENT COMPLETE - NO TURSO SYNC PERFORMED');
console.log('═══════════════════════════════════════════════════════');
