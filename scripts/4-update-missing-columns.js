/**
 * Script 4: Update Missing Columns in Turso
 * Updates age_rating, imdb_id, country_of_origin for existing synced data
 * 
 * IMPORTANT:
 * - Uses DEFAULT NULL (not 'PG') for unknown values
 * - Updates only 3 columns (not full re-sync)
 * - Includes same protection as 3-sync-to-turso-FIXED.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { createClient } = require('@libsql/client')
const db = require('./services/local-db')
const cliProgress = require('cli-progress')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const MOVIE_BATCH_SIZE = 100
const SERIES_BATCH_SIZE = 50

// ============================================================
// Movies Update
// ============================================================
async function updateMoviesBatch(movieIds) {
  const statements = []
  
  for (const tmdb_id of movieIds) {
    const movie = db.prepare(`
      SELECT age_rating, imdb_id, country_of_origin 
      FROM movies WHERE tmdb_id = ?
    `).get(tmdb_id)
    
    if (!movie) continue
    
    statements.push({
      sql: `UPDATE movies SET age_rating = ?, imdb_id = ?, country_of_origin = ? WHERE tmdb_id = ?`,
      args: [
        movie.age_rating || null,
        movie.imdb_id || null,
        movie.country_of_origin || null,
        tmdb_id
      ],
      tmdb_id // for individual fallback
    })
  }
  
  if (statements.length === 0) return 0
  
  try {
    await turso.batch(statements, 'write')
    return statements.length
  } catch (err) {
    // ✅ Fallback: individual updates with immediate tracking
    console.error(`\n⚠️  Batch failed, trying individually...`)
    let updated = 0
    for (const stmt of statements) {
      try {
        await turso.execute({ sql: stmt.sql, args: stmt.args })
        updated++
      } catch (e) {
        console.error(`Failed movie ${stmt.tmdb_id}: ${e.message}`)
      }
    }
    return updated
  }
}

// ============================================================
// TV Series Update
// ============================================================
async function updateSeriesBatch(seriesIds) {
  const statements = []
  
  for (const tmdb_id of seriesIds) {
    const series = db.prepare(`
      SELECT age_rating, imdb_id, country_of_origin 
      FROM tv_series WHERE tmdb_id = ?
    `).get(tmdb_id)
    
    if (!series) continue
    
    statements.push({
      sql: `UPDATE tv_series SET age_rating = ?, imdb_id = ?, country_of_origin = ? WHERE tmdb_id = ?`,
      args: [
        series.age_rating || null,
        series.imdb_id || null,
        series.country_of_origin || null,
        tmdb_id
      ],
      tmdb_id // for individual fallback
    })
  }
  
  if (statements.length === 0) return 0
  
  try {
    await turso.batch(statements, 'write')
    return statements.length
  } catch (err) {
    // ✅ Fallback: individual updates with immediate tracking
    console.error(`\n⚠️  Series batch failed, trying individually...`)
    let updated = 0
    for (const stmt of statements) {
      try {
        await turso.execute({ sql: stmt.sql, args: stmt.args })
        updated++
      } catch (e) {
        console.error(`Failed series ${stmt.tmdb_id}: ${e.message}`)
      }
    }
    return updated
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('🚀 Starting Missing Columns Update...\n')
  
  const stats = { movies: 0, series: 0, errors: 0 }
  
  // Count totals (only synced content)
  const totalMovies = db.prepare(`
    SELECT COUNT(*) as count FROM movies
    WHERE is_complete = 1 
      AND filter_status IN ('clean', 'reviewed_approved')
      AND synced_to_turso = 1
  `).get().count
  
  const totalSeries = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series
    WHERE is_complete = 1 
      AND filter_status IN ('clean', 'reviewed_approved')
      AND synced_to_turso = 1
  `).get().count
  
  console.log(`📊 Statistics:`)
  console.log(`   Movies to update: ${totalMovies.toLocaleString('en-US')}`)
  console.log(`   Series to update: ${totalSeries.toLocaleString('en-US')}`)
  console.log('')
  
  // Update Movies
  if (totalMovies > 0) {
    console.log('🎬 Updating Movies...')
    const movieBar = new cliProgress.SingleBar({
      format: '   {bar} | {percentage}% | {value}/{total} movies',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    })
    movieBar.start(totalMovies, 0)
    
    let offset = 0
    while (offset < totalMovies) {
      const batch = db.prepare(`
        SELECT tmdb_id FROM movies
        WHERE is_complete = 1 
          AND filter_status IN ('clean', 'reviewed_approved')
          AND synced_to_turso = 1
        LIMIT ? OFFSET ?
      `).all(MOVIE_BATCH_SIZE, offset).map(r => r.tmdb_id)
      
      if (batch.length === 0) break
      
      const updated = await updateMoviesBatch(batch)
      stats.movies += updated
      offset += batch.length
      movieBar.update(offset)
    }
    
    movieBar.stop()
    console.log(`   ✅ ${stats.movies.toLocaleString('en-US')} movies\n`)
  }
  
  // Update TV Series
  if (totalSeries > 0) {
    console.log('📺 Updating TV Series...')
    const seriesBar = new cliProgress.SingleBar({
      format: '   {bar} | {percentage}% | {value}/{total} series',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    })
    seriesBar.start(totalSeries, 0)
    
    let offset = 0
    while (offset < totalSeries) {
      const batch = db.prepare(`
        SELECT tmdb_id FROM tv_series
        WHERE is_complete = 1 
          AND filter_status IN ('clean', 'reviewed_approved')
          AND synced_to_turso = 1
        LIMIT ? OFFSET ?
      `).all(SERIES_BATCH_SIZE, offset).map(r => r.tmdb_id)
      
      if (batch.length === 0) break
      
      const updated = await updateSeriesBatch(batch)
      stats.series += updated
      offset += batch.length
      seriesBar.update(offset)
    }
    
    seriesBar.stop()
    console.log(`   ✅ ${stats.series.toLocaleString('en-US')} series\n`)
  }
  
  console.log(`✅ Update completed!`)
  console.log(`   Movies: ${stats.movies.toLocaleString('en-US')}`)
  console.log(`   Series: ${stats.series.toLocaleString('en-US')}`)
}

main().catch(console.error)
