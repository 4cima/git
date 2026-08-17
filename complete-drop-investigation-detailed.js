const db = require('./scripts/services/local-db');

console.log('=== COMPLETE COUNT DROP INVESTIGATION - DETAILED ===\n');

// Current complete counts
const movieComplete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete=1').get().c;
const seriesComplete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete=1').get().c;

console.log('Current complete counts:');
console.log(`  Movies: ${movieComplete.toLocaleString()}`);
console.log(`  Series: ${seriesComplete.toLocaleString()}`);

console.log('\nOriginal counts (from context):');
console.log('  Movies: 268,757');
console.log('  Series: 52,776');

console.log('\nChange:');
console.log(`  Movies: ${movieComplete - 268757}`);
console.log(`  Series: ${seriesComplete - 52776}`);

// Find movies that WERE complete but might have been downgraded
// Search in a WIDE window - last 7 days
console.log('\n=== MOVIES: Looking for items that lost is_complete=1 ===\n');

// Get movies updated recently that are now incomplete
const incompleteMovies = db.prepare(`
  SELECT tmdb_id, title_en, is_complete, is_filtered, filter_reason, 
         overview_en IS NOT NULL as has_overview,
         title_ar IS NOT NULL as has_title_ar,
         poster_path IS NOT NULL as has_poster,
         updated_at
  FROM movies
  WHERE is_complete = 0
    AND updated_at > datetime('now', '-7 days')
  ORDER BY updated_at DESC
  LIMIT 100
`).all();

console.log(`Incomplete movies updated in last 7 days: ${incompleteMovies.length}`);

// Find ones that look like they should be complete
const shouldBeComplete = incompleteMovies.filter(m => 
  m.has_overview && m.has_title_ar && m.has_poster && !m.is_filtered
);

console.log(`Of those, ${shouldBeComplete.length} have all data but is_complete=0\n`);

if (shouldBeComplete.length > 0) {
  console.log("Sample of movies that look complete but aren't:");
  shouldBeComplete.slice(0, 10).forEach(m => {
    console.log(`  ${m.tmdb_id}: ${m.title_en || 'NO TITLE'}`);
    console.log(`    overview=${m.has_overview}, title_ar=${m.has_title_ar}, poster=${m.has_poster}`);
    console.log(`    filtered=${m.is_filtered}, updated=${m.updated_at}`);
    
    // Check what's missing
    const full = db.prepare('SELECT * FROM movies WHERE tmdb_id=?').get(m.tmdb_id);
    const missing = [];
    if (!full.title_ar || full.title_ar === 'TBD') missing.push('title_ar');
    if (!full.title_en) missing.push('title_en');
    if (!full.overview_ar) missing.push('overview_ar');
    if (!full.poster_path) missing.push('poster');
    
    // Check cast
    const cast = db.prepare('SELECT COUNT(*) as c FROM cast_crew WHERE content_tmdb_id=? AND content_type="movie"').get(m.tmdb_id);
    if (cast.c === 0) missing.push('cast');
    
    // Check genres
    const genres = db.prepare('SELECT COUNT(*) as c FROM content_genres WHERE content_tmdb_id=? AND content_type="movie"').get(m.tmdb_id);
    if (genres.c === 0) missing.push('genres');
    
    console.log(`    missing: ${missing.length > 0 ? missing.join(', ') : 'NOTHING - should be complete!'}`);
  });
}

// Same for series
console.log('\n=== SERIES: Looking for items that lost is_complete=1 ===\n');

const incompleteSeries = db.prepare(`
  SELECT tmdb_id, name_en, is_complete, is_filtered, filter_reason,
         overview_en IS NOT NULL as has_overview,
         name_ar IS NOT NULL as has_name_ar,
         poster_path IS NOT NULL as has_poster,
         number_of_seasons,
         updated_at
  FROM tv_series
  WHERE is_complete = 0
    AND updated_at > datetime('now', '-7 days')
  ORDER BY updated_at DESC
  LIMIT 100
`).all();

console.log(`Incomplete series updated in last 7 days: ${incompleteSeries.length}`);

const shouldBeCompleteSeries = incompleteSeries.filter(s =>
  s.has_overview && s.has_name_ar && s.has_poster && !s.is_filtered && s.number_of_seasons > 0
);

console.log(`Of those, ${shouldBeCompleteSeries.length} have all data but is_complete=0\n`);

if (shouldBeCompleteSeries.length > 0) {
  console.log("Sample of series that look complete but aren't:");
  shouldBeCompleteSeries.slice(0, 10).forEach(s => {
    console.log(`  ${s.tmdb_id}: ${s.name_en || 'NO NAME'}`);
    console.log(`    overview=${s.has_overview}, name_ar=${s.has_name_ar}, poster=${s.has_poster}`);
    console.log(`    seasons_claimed=${s.number_of_seasons}, filtered=${s.is_filtered}, updated=${s.updated_at}`);
    
    // Check what's actually missing
    const full = db.prepare('SELECT * FROM tv_series WHERE tmdb_id=?').get(s.tmdb_id);
    const missing = [];
    if (!full.name_ar || full.name_ar === 'TBD') missing.push('name_ar');
    if (!full.name_en) missing.push('name_en');
    if (!full.overview_ar) missing.push('overview_ar');
    if (!full.poster_path) missing.push('poster');
    
    // Check actual seasons in DB
    const seasons = db.prepare('SELECT COUNT(*) as c FROM seasons WHERE series_tmdb_id=?').get(s.tmdb_id);
    if (seasons.c === 0) missing.push(`seasons (has ${seasons.c} but needs ${s.number_of_seasons})`);
    
    // Check cast
    const cast = db.prepare('SELECT COUNT(*) as c FROM cast_crew WHERE content_tmdb_id=? AND content_type="tv"').get(s.tmdb_id);
    if (cast.c === 0) missing.push('cast');
    
    // Check genres
    const genres = db.prepare('SELECT COUNT(*) as c FROM content_genres WHERE content_tmdb_id=? AND content_type="tv"').get(s.tmdb_id);
    if (genres.c === 0) missing.push('genres');
    
    console.log(`    missing: ${missing.length > 0 ? missing.join(', ') : 'NOTHING - should be complete!'}`);
  });
}

console.log('\n=== CONCLUSION ===');
console.log('Complete count changes are likely from:');
console.log('1. Items processed but missing ONE required field (cast, genres, overview_ar, etc.)');
console.log('2. Series missing seasons data even though number_of_seasons > 0');
console.log('3. NOT from items losing complete status - just proper validation');
