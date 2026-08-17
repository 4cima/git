const db = require('./scripts/services/local-db');

console.log('═══════════════════════════════════════════════════════');
console.log('🔍 INVESTIGATING is_complete DROP - ROW-LEVEL EVIDENCE');
console.log('═══════════════════════════════════════════════════════\n');

console.log('ENRICHMENT RUN TIMES (from ingestion_progress table):');
const movieRun = db.prepare(`
  SELECT last_run, status 
  FROM ingestion_progress 
  WHERE script_name = 'INGEST-MOVIES'
`).get();

const seriesRun = db.prepare(`
  SELECT last_run, status 
  FROM ingestion_progress 
  WHERE script_name = 'INGEST-SERIES'
`).get();

console.log(`  Movies:  ${movieRun?.last_run || 'N/A'} (${movieRun?.status || 'N/A'})`);
console.log(`  Series:  ${seriesRun?.last_run || 'N/A'} (${seriesRun?.status || 'N/A'})`);

// Find movies that are incomplete but were updated during enrichment window
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('MOVIES: Items updated during enrichment but now incomplete');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const incompleteMovies = db.prepare(`
  SELECT tmdb_id, title_en, title_ar, 
         overview_en IS NOT NULL as has_overview_en,
         overview_ar IS NOT NULL as has_overview_ar,
         poster_path IS NOT NULL as has_poster,
         title_ar = 'TBD' as title_is_tbd,
         updated_at, is_complete, is_filtered
  FROM movies
  WHERE is_complete = 0
    AND updated_at >= '2026-08-16 07:00:00'
    AND updated_at <= '2026-08-16 08:00:00'
  ORDER BY updated_at DESC
  LIMIT 50
`).all();

console.log(`Found ${incompleteMovies.length} movies updated during enrichment window`);

if (incompleteMovies.length > 0) {
  console.log('\nSample of 10 items:\n');
  incompleteMovies.slice(0, 10).forEach(m => {
    console.log(`tmdb_id: ${m.tmdb_id} | ${m.title_en || 'NO TITLE'}`);
    console.log(`  Data: overview_en=${m.has_overview_en}, overview_ar=${m.has_overview_ar}, poster=${m.has_poster}, title_ar=${m.title_is_tbd ? 'TBD' : 'OK'}`);
    console.log(`  Status: is_complete=${m.is_complete}, is_filtered=${m.is_filtered}`);
    console.log(`  Updated: ${m.updated_at}`);
    
    // Check what's actually missing
    const full = db.prepare('SELECT * FROM movies WHERE tmdb_id=?').get(m.tmdb_id);
    const missing = [];
    
    if (!full.title_ar || full.title_ar === 'TBD') missing.push('title_ar');
    if (!full.title_en) missing.push('title_en');
    if (!full.overview_ar) missing.push('overview_ar');
    if (!full.poster_path) missing.push('poster_path');
    
    // Check cast
    const cast = db.prepare(`
      SELECT COUNT(*) as c 
      FROM cast_crew 
      WHERE content_tmdb_id=? AND content_type='movie'
    `).get(m.tmdb_id);
    if (cast.c === 0) missing.push('cast');
    
    // Check genres
    const genres = db.prepare(`
      SELECT COUNT(*) as c 
      FROM content_genres 
      WHERE content_tmdb_id=? AND content_type='movie'
    `).get(m.tmdb_id);
    if (genres.c === 0) missing.push('genres');
    
    console.log(`  Missing fields: ${missing.length > 0 ? missing.join(', ') : 'NONE - should be complete!'}`);
    console.log('');
  });
}

// Same for series
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('SERIES: Items updated during enrichment but now incomplete');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const incompleteSeries = db.prepare(`
  SELECT tmdb_id, name_en, name_ar,
         overview_en IS NOT NULL as has_overview_en,
         overview_ar IS NOT NULL as has_overview_ar,
         poster_path IS NOT NULL as has_poster,
         number_of_seasons,
         updated_at, is_complete, is_filtered
  FROM tv_series
  WHERE is_complete = 0
    AND updated_at >= '2026-08-16 07:00:00'
    AND updated_at <= '2026-08-16 08:00:00'
  ORDER BY updated_at DESC
  LIMIT 50
`).all();

console.log(`Found ${incompleteSeries.length} series updated during enrichment window`);

if (incompleteSeries.length > 0) {
  console.log('\nSample of 10 items:\n');
  incompleteSeries.slice(0, 10).forEach(s => {
    console.log(`tmdb_id: ${s.tmdb_id} | ${s.name_en || 'NO NAME'}`);
    console.log(`  Data: overview_en=${s.has_overview_en}, overview_ar=${s.has_overview_ar}, poster=${s.has_poster}, seasons=${s.number_of_seasons}`);
    console.log(`  Status: is_complete=${s.is_complete}, is_filtered=${s.is_filtered}`);
    console.log(`  Updated: ${s.updated_at}`);
    
    // Check what's actually missing
    const full = db.prepare('SELECT * FROM tv_series WHERE tmdb_id=?').get(s.tmdb_id);
    const missing = [];
    
    if (!full.name_ar || full.name_ar === 'TBD') missing.push('name_ar');
    if (!full.name_en) missing.push('name_en');
    if (!full.overview_ar) missing.push('overview_ar');
    if (!full.poster_path) missing.push('poster_path');
    
    // Check actual seasons in DB
    const seasons = db.prepare(`
      SELECT COUNT(*) as c 
      FROM seasons 
      WHERE series_tmdb_id=?
    `).get(s.tmdb_id);
    if (seasons.c === 0 && s.number_of_seasons > 0) missing.push(`seasons (has 0 but needs ${s.number_of_seasons})`);
    
    // Check cast
    const cast = db.prepare(`
      SELECT COUNT(*) as c 
      FROM cast_crew 
      WHERE content_tmdb_id=? AND content_type='tv'
    `).get(s.tmdb_id);
    if (cast.c === 0) missing.push('cast');
    
    // Check genres
    const genres = db.prepare(`
      SELECT COUNT(*) as c 
      FROM content_genres 
      WHERE content_tmdb_id=? AND content_type='tv'
    `).get(s.tmdb_id);
    if (genres.c === 0) missing.push('genres');
    
    console.log(`  Missing fields: ${missing.length > 0 ? missing.join(', ') : 'NONE - should be complete!'}`);
    console.log('');
  });
}

// Check if enrichment scripts actually touched items that WERE complete
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('CHECKING: Did scripts re-process already-complete items?');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// The scripts should skip items where is_complete=1
// Check if any complete items were updated
const completeUpdated = db.prepare(`
  SELECT COUNT(*) as c
  FROM movies
  WHERE is_complete = 1
    AND updated_at >= '2026-08-16 07:00:00'
    AND updated_at <= '2026-08-16 08:00:00'
`).get();

const completeSeriesUpdated = db.prepare(`
  SELECT COUNT(*) as c
  FROM tv_series
  WHERE is_complete = 1
    AND updated_at >= '2026-08-16 07:00:00'
    AND updated_at <= '2026-08-16 08:00:00'
`).get();

console.log('Complete items updated during enrichment:');
console.log(`  Movies:  ${completeUpdated.c} (should be 0 if scripts skipped them)`);
console.log(`  Series:  ${completeSeriesUpdated.c} (should be 0 if scripts skipped them)`);

if (completeUpdated.c > 0) {
  console.log('\n⚠️  WARNING: Scripts touched items that were already complete!');
  console.log('This suggests scripts did NOT skip is_complete=1 items as claimed.');
  
  const sample = db.prepare(`
    SELECT tmdb_id, title_en, is_complete, updated_at
    FROM movies
    WHERE is_complete = 1
      AND updated_at >= '2026-08-16 07:00:00'
      AND updated_at <= '2026-08-16 08:00:00'
    LIMIT 5
  `).all();
  
  console.log('\nSample:');
  sample.forEach(m => console.log(`  ${m.tmdb_id}: ${m.title_en} - updated ${m.updated_at}`));
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('SUMMARY:');
console.log('═══════════════════════════════════════════════════════\n');

console.log(`1. Query method: Consistent across all checks (WHERE is_complete=1)`);
console.log(`2. Incomplete items updated during run: ${incompleteMovies.length} movies, ${incompleteSeries.length} series`);
console.log(`3. Complete items touched during run: ${completeUpdated.c} movies, ${completeSeriesUpdated.c} series`);

if (incompleteMovies.length === 0 && incompleteSeries.length === 0) {
  console.log('\n⚠️  NO incomplete items were updated during enrichment window!');
  console.log('This suggests the drop happened BEFORE this session, not during it.');
} else if (completeUpdated.c > 0) {
  console.log('\n⚠️  Scripts touched already-complete items despite "skip" claim.');
  console.log('This could cause validation changes (e.g., re-checking requirements).');
}
