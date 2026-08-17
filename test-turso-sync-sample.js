#!/usr/bin/env node
/**
 * Test Turso Sync - Small Sample (100 movies + 100 series)
 * Tests the sync script on a small sample before full production run
 */

require('dotenv').config({ path: require('path').join(__dirname, './.env.local') })
const { createClient } = require('@libsql/client')
const db = require('./scripts/services/local-db')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const BATCH_SIZE = 100
const SAMPLE_SIZE = 100 // Test with 100 of each

// ============================================================
// Helper: Convert value to JSON or null
// ============================================================
function toJsonOrNull(value) {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return null
}

// ============================================================
// Movies Sync (same as main script)
// ============================================================
async function syncMoviesBatch(movieIds) {
  const statements = []
  
  for (const tmdb_id of movieIds) {
    const movie = db.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(tmdb_id)
    if (!movie) continue
    
    const genres = db.prepare(`
      SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
      FROM genres g
      JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(tmdb_id)
    
    const cast = db.prepare(`
      SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
             cc.character_name, cc.cast_order
      FROM people p
      JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
      WHERE cc.content_tmdb_id = ? AND cc.content_type = 'movie'
        AND cc.role_type = 'cast'
      ORDER BY cc.cast_order
      LIMIT 10
    `).all(tmdb_id)
    
    const countries = movie.country_of_origin 
      ? [{ name: movie.country_of_origin }]
      : []
    
    statements.push({
      sql: `
        INSERT INTO movies (
          id, tmdb_id, slug,
          title_en, title_ar,
          overview_ar,
          poster_path, backdrop_path,
          release_date, release_year,
          vote_average, vote_count, popularity, runtime,
          trailer_key,
          genres_json, cast_json, countries_json,
          keywords_json, companies_json,
          seo_title_ar, seo_description_ar, seo_keywords_json,
          canonical_url,
          created_at, updated_at,
          filter_status, original_language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tmdb_id) DO UPDATE SET
          slug = excluded.slug,
          title_en = excluded.title_en,
          title_ar = excluded.title_ar,
          overview_ar = excluded.overview_ar,
          poster_path = excluded.poster_path,
          backdrop_path = excluded.backdrop_path,
          release_date = excluded.release_date,
          release_year = excluded.release_year,
          vote_average = excluded.vote_average,
          vote_count = excluded.vote_count,
          popularity = excluded.popularity,
          runtime = excluded.runtime,
          trailer_key = excluded.trailer_key,
          genres_json = excluded.genres_json,
          cast_json = excluded.cast_json,
          countries_json = excluded.countries_json,
          keywords_json = excluded.keywords_json,
          companies_json = excluded.companies_json,
          seo_title_ar = excluded.seo_title_ar,
          seo_description_ar = excluded.seo_description_ar,
          seo_keywords_json = excluded.seo_keywords_json,
          canonical_url = excluded.canonical_url,
          updated_at = excluded.updated_at,
          filter_status = excluded.filter_status,
          original_language = excluded.original_language
      `,
      args: [
        movie.tmdb_id, movie.tmdb_id, movie.slug,
        movie.title_en, movie.title_ar,
        movie.overview_ar,
        movie.poster_path, movie.backdrop_path,
        movie.release_date, movie.release_year,
        movie.vote_average, movie.vote_count, movie.popularity, movie.runtime,
        movie.trailer_key,
        JSON.stringify(genres),
        JSON.stringify(cast),
        JSON.stringify(countries),
        toJsonOrNull(movie.seo_keywords_json),
        toJsonOrNull(movie.production_companies),
        movie.seo_title_ar, movie.seo_description_ar, toJsonOrNull(movie.seo_keywords_json),
        movie.canonical_url,
        movie.created_at, movie.updated_at,
        movie.filter_status, movie.original_language || null
      ]
    })
  }
  
  if (statements.length === 0) return 0
  
  try {
    await turso.batch(statements, 'write')
    return statements.length
  } catch (err) {
    console.error(`Batch failed:`, err.message)
    throw err
  }
}

// ============================================================
// TV Series Sync (same as main script)
// ============================================================
async function syncSeriesBatch(seriesIds) {
  const statements = []
  const skipped = []
  
  for (const tmdb_id of seriesIds) {
    const series = db.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(tmdb_id)
    if (!series) continue
    
    if (!series.slug) {
      skipped.push({ tmdb_id, reason: 'NULL slug', name: series.name_en })
      continue
    }
    
    const genres = db.prepare(`
      SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
      FROM genres g
      JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(tmdb_id)
    
    const cast = db.prepare(`
      SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
             cc.character_name, cc.cast_order
      FROM people p
      JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
      WHERE cc.content_tmdb_id = ? AND cc.content_type = 'tv'
        AND cc.role_type = 'cast'
      ORDER BY cc.cast_order
      LIMIT 10
    `).all(tmdb_id)
    
    const seasons = db.prepare(`
      SELECT season_number, name_en, episode_count, air_date, poster_path
      FROM seasons WHERE series_tmdb_id = ?
      ORDER BY season_number
    `).all(tmdb_id)
    
    const episodes = db.prepare(`
      SELECT season_number, episode_number, name_en, overview_en,
             still_path, air_date, runtime, vote_average
      FROM episodes WHERE series_tmdb_id = ?
      ORDER BY season_number, episode_number
    `).all(tmdb_id)
    
    statements.push({
      sql: `
        INSERT INTO tv_series (
          id, tmdb_id, slug,
          name_en, name_ar,
          overview_ar,
          poster_path, backdrop_path,
          first_air_date, first_air_year,
          number_of_seasons, number_of_episodes, status,
          vote_average, vote_count, popularity,
          trailer_key,
          genres_json, cast_json,
          seasons_json, episodes_json,
          seo_title_ar, seo_description_ar, seo_keywords_json,
          canonical_url,
          created_at, updated_at,
          filter_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tmdb_id) DO UPDATE SET
          slug = excluded.slug,
          name_en = excluded.name_en,
          name_ar = excluded.name_ar,
          overview_ar = excluded.overview_ar,
          poster_path = excluded.poster_path,
          backdrop_path = excluded.backdrop_path,
          first_air_date = excluded.first_air_date,
          first_air_year = excluded.first_air_year,
          number_of_seasons = excluded.number_of_seasons,
          number_of_episodes = excluded.number_of_episodes,
          status = excluded.status,
          vote_average = excluded.vote_average,
          vote_count = excluded.vote_count,
          popularity = excluded.popularity,
          trailer_key = excluded.trailer_key,
          genres_json = excluded.genres_json,
          cast_json = excluded.cast_json,
          seasons_json = excluded.seasons_json,
          episodes_json = excluded.episodes_json,
          seo_title_ar = excluded.seo_title_ar,
          seo_description_ar = excluded.seo_description_ar,
          seo_keywords_json = excluded.seo_keywords_json,
          canonical_url = excluded.canonical_url,
          updated_at = excluded.updated_at,
          filter_status = excluded.filter_status
      `,
      args: [
        series.tmdb_id, series.tmdb_id, series.slug,
        series.name_en, series.name_ar,
        series.overview_ar,
        series.poster_path, series.backdrop_path,
        series.first_air_date, series.first_air_year,
        series.number_of_seasons, series.number_of_episodes, series.status,
        series.vote_average, series.vote_count, series.popularity,
        series.trailer_key,
        JSON.stringify(genres),
        JSON.stringify(cast),
        JSON.stringify(seasons),
        JSON.stringify(episodes),
        series.seo_title_ar, series.seo_description_ar, toJsonOrNull(series.seo_keywords_json),
        series.canonical_url,
        series.created_at, series.updated_at,
        series.filter_status
      ]
    })
  }
  
  if (statements.length === 0) {
    if (skipped.length > 0) {
      skipped.forEach(s => console.log(`  ⚠️  Skipped tmdb_id ${s.tmdb_id} (${s.reason})`))
    }
    return 0
  }
  
  try {
    await turso.batch(statements, 'write')
    return statements.length
  } catch (err) {
    console.error(`Series batch failed:`, err.message)
    throw err
  }
}

// ============================================================
// Main Test
// ============================================================
async function main() {
  console.log('🧪 TURSO SYNC TEST - SMALL SAMPLE\n')
  console.log(`Sample size: ${SAMPLE_SIZE} movies + ${SAMPLE_SIZE} series\n`)
  
  const stats = { movies: 0, series: 0, errors: 0 }
  const startTime = Date.now()
  
  // Test Movies
  console.log('🎬 Testing movies sync...')
  const movieBatch = db.prepare(`
    SELECT tmdb_id FROM movies
    WHERE is_complete = 1 AND synced_to_turso = 0
    ORDER BY vote_count DESC
    LIMIT ?
  `).all(SAMPLE_SIZE).map(r => r.tmdb_id)
  
  console.log(`  Found ${movieBatch.length} unsynced complete movies`)
  
  if (movieBatch.length > 0) {
    try {
      const movieStartTime = Date.now()
      const synced = await syncMoviesBatch(movieBatch)
      const movieDuration = (Date.now() - movieStartTime) / 1000
      stats.movies = synced
      console.log(`  ✅ Synced ${synced} movies in ${movieDuration.toFixed(1)}s`)
      console.log(`  ⚡ Rate: ${(synced / movieDuration * 60).toFixed(0)} movies/minute`)
    } catch (err) {
      console.error(`  ❌ Movies sync failed:`, err.message)
      stats.errors++
    }
  }
  
  // Test Series
  console.log('\n📺 Testing series sync...')
  const seriesBatch = db.prepare(`
    SELECT tmdb_id FROM tv_series
    WHERE is_complete = 1 AND synced_to_turso = 0
    ORDER BY vote_count DESC
    LIMIT ?
  `).all(SAMPLE_SIZE).map(r => r.tmdb_id)
  
  console.log(`  Found ${seriesBatch.length} unsynced complete series`)
  
  if (seriesBatch.length > 0) {
    try {
      const seriesStartTime = Date.now()
      const synced = await syncSeriesBatch(seriesBatch)
      const seriesDuration = (Date.now() - seriesStartTime) / 1000
      stats.series = synced
      console.log(`  ✅ Synced ${synced} series in ${seriesDuration.toFixed(1)}s`)
      console.log(`  ⚡ Rate: ${(synced / seriesDuration * 60).toFixed(0)} series/minute`)
    } catch (err) {
      console.error(`  ❌ Series sync failed:`, err.message)
      stats.errors++
    }
  }
  
  const totalDuration = (Date.now() - startTime) / 1000
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 TEST RESULTS:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Movies synced:    ${stats.movies}`)
  console.log(`Series synced:    ${stats.series}`)
  console.log(`Errors:           ${stats.errors}`)
  console.log(`Total duration:   ${totalDuration.toFixed(1)}s`)
  console.log(`Average rate:     ${((stats.movies + stats.series) / totalDuration * 60).toFixed(0)} items/minute`)
  
  // Estimate full sync
  const totalPending = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM movies WHERE is_complete=1 AND synced_to_turso=0) as movies,
      (SELECT COUNT(*) FROM tv_series WHERE is_complete=1 AND synced_to_turso=0) as series
  `).get()
  
  const movieRate = stats.movies > 0 ? stats.movies / totalDuration : 0
  const seriesRate = stats.series > 0 ? stats.series / totalDuration : 0
  
  const estimatedMovieTime = movieRate > 0 ? totalPending.movies / movieRate : 0
  const estimatedSeriesTime = seriesRate > 0 ? totalPending.series / seriesRate : 0
  const estimatedTotal = estimatedMovieTime + estimatedSeriesTime
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📈 FULL SYNC ESTIMATE:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Pending movies:   ${totalPending.movies.toLocaleString()}`)
  console.log(`Pending series:   ${totalPending.series.toLocaleString()}`)
  console.log(`\nEstimated time:`)
  console.log(`  Movies:         ${(estimatedMovieTime / 60).toFixed(0)} minutes`)
  console.log(`  Series:         ${(estimatedSeriesTime / 60).toFixed(0)} minutes`)
  console.log(`  Total:          ${(estimatedTotal / 60).toFixed(0)} minutes (${(estimatedTotal / 3600).toFixed(1)} hours)`)
  console.log(`\nEstimated operations:`)
  console.log(`  ~${((totalPending.movies + totalPending.series) * 2).toLocaleString()} Turso read/write ops`)
  console.log(`  (reads for JOIN queries + writes for UPSERT)`)
  console.log('\n⚠️  NOTE: This is an extrapolation from the small sample.')
  console.log('    Actual time may vary based on network conditions.')
  console.log('    Each item uses UPSERT (INSERT ... ON CONFLICT DO UPDATE).')
}

main().catch(console.error)
