/**
 * Script 3: Sync to Turso (FIXED VERSION)
 * Syncs local database to Turso production
 * 
 * FIXES:
 * - ✅ catch block now updates synced_to_turso for individual successes
 * - ✅ Added progress bar for visibility
 * - ✅ Reduced SERIES_BATCH_SIZE to 50 (from 100)
 * - ✅ Added detailed logging
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
const SERIES_BATCH_SIZE = 50  // Reduced for episodes_json size

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
// Movies Sync (FIXED)
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
        toJsonOrNull(movie.keywords_json),
        toJsonOrNull(movie.companies_json),
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
    
    const placeholders = movieIds.map(() => '?').join(',')
    db.prepare(`
      UPDATE movies SET synced_to_turso = 1, synced_at = datetime('now')
      WHERE tmdb_id IN (${placeholders})
    `).run(...movieIds)
    
    return statements.length
  } catch (err) {
    // ✅ FIXED: Fallback with proper local DB updates
    console.error(`\n⚠️  Batch failed, trying individually...`)
    let synced = 0
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const tmdb_id = movieIds[i]
      try {
        await turso.execute(stmt)
        // ✅ Update local DB immediately after successful insert
        db.prepare(`
          UPDATE movies 
          SET synced_to_turso = 1, synced_at = datetime('now')
          WHERE tmdb_id = ?
        `).run(tmdb_id)
        synced++
      } catch (e) {
        console.error(`Failed movie ${tmdb_id}:`, e.message)
      }
    }
    return synced
  }
}

// ============================================================
// TV Series Sync (FIXED)
// ============================================================
async function syncSeriesBatch(seriesIds) {
  const statements = []
  
  for (const tmdb_id of seriesIds) {
    const series = db.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(tmdb_id)
    if (!series) continue
    
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
  
  if (statements.length === 0) return 0
  
  try {
    await turso.batch(statements, 'write')
    
    const placeholders = seriesIds.map(() => '?').join(',')
    db.prepare(`
      UPDATE tv_series SET synced_to_turso = 1, synced_at = datetime('now')
      WHERE tmdb_id IN (${placeholders})
    `).run(...seriesIds)
    
    return statements.length
  } catch (err) {
    // ✅ FIXED: Fallback with proper local DB updates
    console.error(`\n⚠️  Series batch failed, trying individually...`)
    let synced = 0
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const tmdb_id = seriesIds[i]
      try {
        await turso.execute(stmt)
        // ✅ Update local DB immediately after successful insert
        db.prepare(`
          UPDATE tv_series 
          SET synced_to_turso = 1, synced_at = datetime('now')
          WHERE tmdb_id = ?
        `).run(tmdb_id)
        synced++
      } catch (e) {
        console.error(`Failed series ${tmdb_id}:`, e.message)
      }
    }
    return synced
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('🚀 بدء المزامنة مع Turso (FIXED VERSION)...\n')
  
  const stats = { movies: 0, series: 0, errors: 0 }
  
  // Count totals
  const totalMovies = db.prepare(`
    SELECT COUNT(*) as count FROM movies
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') AND synced_to_turso = 0
  `).get().count
  
  const totalSeries = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') AND synced_to_turso = 0
      AND slug IS NOT NULL AND slug != ''
  `).get().count
  
  console.log(`📊 الإحصائيات:`)
  console.log(`   أفلام متبقية: ${totalMovies.toLocaleString('en-US')}`)
  console.log(`   مسلسلات متبقية: ${totalSeries.toLocaleString('en-US')}`)
  console.log('')
  
  // Sync Movies
  if (totalMovies > 0) {
    console.log('🎬 مزامنة الأفلام...')
    const movieBar = new cliProgress.SingleBar({
      format: '   {bar} | {percentage}% | {value}/{total} أفلام',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    })
    movieBar.start(totalMovies, 0)
    
    while (true) {
      const batch = db.prepare(`
        SELECT tmdb_id FROM movies
        WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') AND synced_to_turso = 0
        LIMIT ?
      `).all(MOVIE_BATCH_SIZE).map(r => r.tmdb_id)
      
      if (batch.length === 0) break
      
      const synced = await syncMoviesBatch(batch)
      stats.movies += synced
      movieBar.update(stats.movies)
    }
    
    movieBar.stop()
    console.log(`   ✅ ${stats.movies.toLocaleString('en-US')} فيلم\n`)
  }
  
  // Sync TV Series
  if (totalSeries > 0) {
    console.log('📺 مزامنة المسلسلات...')
    const seriesBar = new cliProgress.SingleBar({
      format: '   {bar} | {percentage}% | {value}/{total} مسلسل',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    })
    seriesBar.start(totalSeries, 0)
    
    while (true) {
      const batch = db.prepare(`
        SELECT tmdb_id FROM tv_series
        WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') AND synced_to_turso = 0
          AND slug IS NOT NULL AND slug != ''
        LIMIT ?
      `).all(SERIES_BATCH_SIZE).map(r => r.tmdb_id)
      
      if (batch.length === 0) break
      
      const synced = await syncSeriesBatch(batch)
      stats.series += synced
      seriesBar.update(stats.series)
    }
    
    seriesBar.stop()
    console.log(`   ✅ ${stats.series.toLocaleString('en-US')} مسلسل\n`)
  }
  
  console.log(`✅ اكتملت المزامنة!`)
  console.log(`   أفلام: ${stats.movies.toLocaleString('en-US')}`)
  console.log(`   مسلسلات: ${stats.series.toLocaleString('en-US')}`)
}

main().catch(console.error)
