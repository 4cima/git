const db = require('./scripts/services/local-db');

console.log('═══════════════════════════════════════════════════════');
console.log('🎯 TURSO SYNC VERIFICATION - DIRECT DATABASE QUERIES');
console.log('═══════════════════════════════════════════════════════\n');

// Total synced counts
const moviesSynced = db.prepare('SELECT COUNT(*) as c FROM movies WHERE synced_to_turso=1').get();
const seriesSynced = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE synced_to_turso=1').get();

console.log('SYNCED TO TURSO:');
console.log(`  Movies:  ${moviesSynced.c.toLocaleString()}`);
console.log(`  Series:  ${seriesSynced.c.toLocaleString()}`);

// Pending items (complete but not synced)
const moviesPending = db.prepare(`
  SELECT COUNT(*) as c 
  FROM movies 
  WHERE is_complete=1 
    AND filter_status IN ('clean', 'reviewed_approved') 
    AND synced_to_turso=0
`).get();

const seriesPending = db.prepare(`
  SELECT COUNT(*) as c 
  FROM tv_series 
  WHERE is_complete=1 
    AND filter_status IN ('clean', 'reviewed_approved') 
    AND synced_to_turso=0
`).get();

console.log('\nPENDING (complete but not synced):');
console.log(`  Movies:  ${moviesPending.c.toLocaleString()}`);
console.log(`  Series:  ${seriesPending.c.toLocaleString()}`);

// Items synced in this run (recently synced)
const recentMovies = db.prepare(`
  SELECT COUNT(*) as c 
  FROM movies 
  WHERE synced_to_turso=1 
    AND synced_at > datetime('now', '-10 minutes')
`).get();

const recentSeries = db.prepare(`
  SELECT COUNT(*) as c 
  FROM tv_series 
  WHERE synced_to_turso=1 
    AND synced_at > datetime('now', '-10 minutes')
`).get();

console.log('\nSYNCED IN LAST 10 MINUTES (this run):');
console.log(`  Movies:  ${recentMovies.c.toLocaleString()}`);
console.log(`  Series:  ${recentSeries.c.toLocaleString()}`);

// Complete items
const moviesComplete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete=1').get();
const seriesComplete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete=1').get();

console.log('\nCOMPLETE ITEMS (local):');
console.log(`  Movies:  ${moviesComplete.c.toLocaleString()}`);
console.log(`  Series:  ${seriesComplete.c.toLocaleString()}`);

console.log('\n═══════════════════════════════════════════════════════');
