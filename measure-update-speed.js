/**
 * Stage 1 - Step 2: Measure Real UPDATE Speed
 * Tests UPDATE performance on actual data before committing to full sync
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')
const db = require('./scripts/services/local-db')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function measureSpeed() {
  console.log('📏 Measuring UPDATE speed on real data...\n')
  
  // ============================================================
  // Test 1: Movies (100 rows)
  // ============================================================
  console.log('🎬 Test 1: Movies (100 rows)')
  
  // Get 100 movies that already exist in Turso
  const movieIds = db.prepare(`
    SELECT tmdb_id FROM movies
    WHERE is_complete = 1 
      AND filter_status IN ('clean', 'reviewed_approved')
      AND synced_to_turso = 1
    LIMIT 100
  `).all().map(r => r.tmdb_id)
  
  console.log(`   Found ${movieIds.length} movies to test`)
  
  // Prepare UPDATE statements
  const movieStatements = []
  for (const tmdb_id of movieIds) {
    const movie = db.prepare(`
      SELECT age_rating, imdb_id, country_of_origin 
      FROM movies WHERE tmdb_id = ?
    `).get(tmdb_id)
    
    if (!movie) continue
    
    movieStatements.push({
      sql: `UPDATE movies SET age_rating = ?, imdb_id = ?, country_of_origin = ? WHERE tmdb_id = ?`,
      args: [
        movie.age_rating || null,
        movie.imdb_id || null,
        movie.country_of_origin || null,
        tmdb_id
      ]
    })
  }
  
  // Execute and measure
  console.log(`   Executing UPDATE batch (${movieStatements.length} statements)...`)
  const movieStart = Date.now()
  await turso.batch(movieStatements, 'write')
  const movieTime = (Date.now() - movieStart) / 1000
  
  console.log(`   ✅ Completed in ${movieTime.toFixed(2)} seconds`)
  console.log(`   ⏱️  Average: ${(movieTime / movieStatements.length * 1000).toFixed(0)}ms per movie\n`)
  
  // ============================================================
  // Test 2: TV Series (50 rows)
  // ============================================================
  console.log('📺 Test 2: TV Series (50 rows)')
  
  // Get 50 series that already exist in Turso
  const seriesIds = db.prepare(`
    SELECT tmdb_id FROM tv_series
    WHERE is_complete = 1 
      AND filter_status IN ('clean', 'reviewed_approved')
      AND synced_to_turso = 1
    LIMIT 50
  `).all().map(r => r.tmdb_id)
  
  console.log(`   Found ${seriesIds.length} series to test`)
  
  // Prepare UPDATE statements
  const seriesStatements = []
  for (const tmdb_id of seriesIds) {
    const series = db.prepare(`
      SELECT age_rating, imdb_id, country_of_origin 
      FROM tv_series WHERE tmdb_id = ?
    `).get(tmdb_id)
    
    if (!series) continue
    
    seriesStatements.push({
      sql: `UPDATE tv_series SET age_rating = ?, imdb_id = ?, country_of_origin = ? WHERE tmdb_id = ?`,
      args: [
        series.age_rating || null,
        series.imdb_id || null,
        series.country_of_origin || null,
        tmdb_id
      ]
    })
  }
  
  // Execute and measure
  console.log(`   Executing UPDATE batch (${seriesStatements.length} statements)...`)
  const seriesStart = Date.now()
  await turso.batch(seriesStatements, 'write')
  const seriesTime = (Date.now() - seriesStart) / 1000
  
  console.log(`   ✅ Completed in ${seriesTime.toFixed(2)} seconds`)
  console.log(`   ⏱️  Average: ${(seriesTime / seriesStatements.length * 1000).toFixed(0)}ms per series\n`)
  
  // ============================================================
  // Calculations
  // ============================================================
  console.log('📊 Speed Calculation:\n')
  
  const totalMovies = 268755
  const totalSeries = 52775
  
  const moviesPerBatch = 100
  const seriesPerBatch = 50
  
  const movieBatches = Math.ceil(totalMovies / moviesPerBatch)
  const seriesBatches = Math.ceil(totalSeries / seriesPerBatch)
  
  const estimatedMovieTime = (movieBatches * movieTime) / 60 // minutes
  const estimatedSeriesTime = (seriesBatches * seriesTime) / 60 // minutes
  const estimatedTotal = estimatedMovieTime + estimatedSeriesTime
  
  console.log(`Movies:`)
  console.log(`   - Total: ${totalMovies.toLocaleString('en-US')}`)
  console.log(`   - Batches: ${movieBatches.toLocaleString('en-US')} (${moviesPerBatch} per batch)`)
  console.log(`   - Time per batch: ${movieTime.toFixed(2)}s`)
  console.log(`   - Estimated total: ${estimatedMovieTime.toFixed(1)} minutes (${(estimatedMovieTime/60).toFixed(2)} hours)`)
  
  console.log(`\nTV Series:`)
  console.log(`   - Total: ${totalSeries.toLocaleString('en-US')}`)
  console.log(`   - Batches: ${seriesBatches.toLocaleString('en-US')} (${seriesPerBatch} per batch)`)
  console.log(`   - Time per batch: ${seriesTime.toFixed(2)}s`)
  console.log(`   - Estimated total: ${estimatedSeriesTime.toFixed(1)} minutes (${(estimatedSeriesTime/60).toFixed(2)} hours)`)
  
  console.log(`\n⏱️  TOTAL ESTIMATED TIME: ${estimatedTotal.toFixed(1)} minutes (${(estimatedTotal/60).toFixed(2)} hours)`)
  
  // Verification
  console.log(`\n🔍 Verifying updates...`)
  const moviesUpdated = await turso.execute(`SELECT COUNT(*) as count FROM movies WHERE age_rating IS NOT NULL OR imdb_id IS NOT NULL OR country_of_origin IS NOT NULL`)
  const seriesUpdated = await turso.execute(`SELECT COUNT(*) as count FROM tv_series WHERE age_rating IS NOT NULL OR imdb_id IS NOT NULL OR country_of_origin IS NOT NULL`)
  
  console.log(`   Movies with data: ${moviesUpdated.rows[0].count || moviesUpdated.rows[0][0]}`)
  console.log(`   Series with data: ${seriesUpdated.rows[0].count || seriesUpdated.rows[0][0]}`)
  
  console.log(`\n✅ Speed measurement complete!`)
}

measureSpeed().catch(console.error)
