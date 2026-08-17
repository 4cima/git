#!/usr/bin/env node
/**
 * VERIFY "SHOULD BE COMPLETE" ITEMS
 * Check if items like tmdb_id 1737162, 1739346, 586950 genuinely have cast/genres in TMDB
 */

import Database from 'better-sqlite3'

const db = new Database('data/4cima-local.db')

console.log('═══════════════════════════════════════════════════════════════')
console.log('VERIFY "SHOULD BE COMPLETE" ITEMS')
console.log('═══════════════════════════════════════════════════════════════\n')

// Movies that show "NONE - should be complete!" but are marked incomplete
const testMovies = [1737162, 1739346, 586950, 1217681, 1360415]

console.log('CHECKING MOVIES THAT "SHOULD BE COMPLETE":\n')

for (const tmdbId of testMovies) {
  const movie = db.prepare(`
    SELECT 
      tmdb_id, title_en, title_ar, overview_ar, poster_path,
      is_complete, is_filtered
    FROM movies WHERE tmdb_id = ?
  `).get(tmdbId)
  
  if (!movie) {
    console.log(`❌ Movie ${tmdbId} not found in DB\n`)
    continue
  }
  
  const genres = db.prepare(`
    SELECT g.name_en 
    FROM content_genres cg
    JOIN genres g ON g.tmdb_id = cg.genre_tmdb_id
    WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
  `).all(tmdbId)
  
  const cast = db.prepare(`
    SELECT p.name_en, cc.character_name
    FROM cast_crew cc
    JOIN people p ON p.tmdb_id = cc.person_tmdb_id
    WHERE cc.content_tmdb_id = ? AND cc.content_type = 'movie' AND cc.role_type = 'cast'
    ORDER BY cc.cast_order
    LIMIT 5
  `).all(tmdbId)
  
  console.log(`Movie ${tmdbId}: ${movie.title_en}`)
  console.log(`  title_ar: ${movie.title_ar ? '✓' : '✗'}`)
  console.log(`  overview_ar: ${movie.overview_ar ? '✓' : '✗'}`)
  console.log(`  poster_path: ${movie.poster_path ? '✓' : '✗'}`)
  console.log(`  Genres (${genres.length}): ${genres.length > 0 ? genres.map(g => g.name_en).join(', ') : 'NONE'}`)
  console.log(`  Cast (${cast.length}): ${cast.length > 0 ? cast.map(c => `${c.name_en} as ${c.character_name || 'N/A'}`).join(', ') : 'NONE'}`)
  console.log(`  is_complete: ${movie.is_complete}`)
  
  const missing = []
  if (!movie.title_ar || movie.title_ar === 'TBD') missing.push('title_ar')
  if (!movie.title_en) missing.push('title_en')
  if (!movie.overview_ar) missing.push('overview_ar')
  if (!movie.poster_path) missing.push('poster_path')
  if (cast.length === 0) missing.push('cast')
  if (genres.length === 0) missing.push('genres')
  
  console.log(`  → ${missing.length > 0 ? 'Missing: ' + missing.join(', ') : '✓ ALL DATA PRESENT - should be is_complete=1'}`)
  console.log()
}

// Series that show "genres, cast" missing
const testSeries = [258411, 235023, 123503, 84229]

console.log('\n═══════════════════════════════════════════════════════════════')
console.log('CHECKING SERIES THAT HAVE ALL DATA BUT is_complete=0:\n')

for (const tmdbId of testSeries) {
  const series = db.prepare(`
    SELECT 
      tmdb_id, name_en, name_ar, overview_ar, poster_path,
      is_complete, is_filtered
    FROM tv_series WHERE tmdb_id = ?
  `).get(tmdbId)
  
  if (!series) {
    console.log(`❌ Series ${tmdbId} not found in DB\n`)
    continue
  }
  
  const genres = db.prepare(`
    SELECT g.name_en 
    FROM content_genres cg
    JOIN genres g ON g.tmdb_id = cg.genre_tmdb_id
    WHERE cg.content_tmdb_id = ? AND cg.content_type = 'series'
  `).all(tmdbId)
  
  const cast = db.prepare(`
    SELECT p.name_en, cc.character_name
    FROM cast_crew cc
    JOIN people p ON p.tmdb_id = cc.person_tmdb_id
    WHERE cc.content_tmdb_id = ? AND cc.content_type = 'series' AND cc.role_type = 'cast'
    ORDER BY cc.cast_order
    LIMIT 5
  `).all(tmdbId)
  
  const seasons = db.prepare(`
    SELECT season_number 
    FROM seasons 
    WHERE series_tmdb_id = ?
    ORDER BY season_number
  `).all(tmdbId)
  
  console.log(`Series ${tmdbId}: ${series.name_en}`)
  console.log(`  name_ar: ${series.name_ar ? '✓' : '✗'}`)
  console.log(`  overview_ar: ${series.overview_ar ? '✓' : '✗'}`)
  console.log(`  poster_path: ${series.poster_path ? '✓' : '✗'}`)
  console.log(`  Genres (${genres.length}): ${genres.length > 0 ? genres.map(g => g.name_en).join(', ') : 'NONE'}`)
  console.log(`  Cast (${cast.length}): ${cast.length > 0 ? cast.map(c => `${c.name_en} as ${c.character_name || 'N/A'}`).join(', ') : 'NONE'}`)
  console.log(`  Seasons (${seasons.length}): ${seasons.length > 0 ? seasons.map(s => s.season_number).join(', ') : 'NONE'}`)
  console.log(`  is_complete: ${series.is_complete}`)
  
  const missing = []
  if (!series.name_ar || series.name_ar === 'TBD') missing.push('name_ar')
  if (!series.name_en) missing.push('name_en')
  if (!series.overview_ar) missing.push('overview_ar')
  if (!series.poster_path) missing.push('poster_path')
  if (cast.length === 0) missing.push('cast')
  if (genres.length === 0) missing.push('genres')
  if (seasons.length === 0) missing.push('seasons')
  
  console.log(`  → ${missing.length > 0 ? 'Missing: ' + missing.join(', ') : '✓ ALL DATA PRESENT - should be is_complete=1'}`)
  console.log()
}

console.log('\n═══════════════════════════════════════════════════════════════')
console.log('CONCLUSION')
console.log('═══════════════════════════════════════════════════════════════')
console.log('If items show "ALL DATA PRESENT" but is_complete=0, this means:')
console.log('1. The is_complete calculation in processMovie/processSeries has a BUG')
console.log('2. OR the data was present at enrichment time but got lost somehow')
console.log('3. OR the WHERE clause logic is checking stale cast_crew table data\n')

db.close()
