#!/usr/bin/env node
/**
 * Test Script: Sync 50 Movies + 10 Series to Turso
 * Tests the fixed 3-sync-to-turso.js on real is_complete=1 data
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')
const db = require('./scripts/services/local-db')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

// ============================================================
// Helper: Convert value to JSON or null (same as main script)
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
// Movies Sync (copied from main script)
// ============================================================
async function syncMovie(tmdb_id) {
  const movie = db.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(tmdb_id)
  if (!movie) return { success: false, error: 'Movie not found in local.db' }
  
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
  
  try {
    await turso.execute({
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
    return { success: true, tmdb_id, title: movie.title_ar || movie.title_en }
  } catch (err) {
    return { success: false, tmdb_id, error: err.message }
  }
}

// ============================================================
// TV Series Sync (copied from main script)
// ============================================================
async function syncSeries(tmdb_id) {
  const series = db.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(tmdb_id)
  if (!series) return { success: false, error: 'Series not found in local.db' }
  
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
  
  try {
    await turso.execute({
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
    return { success: true, tmdb_id, title: series.name_ar || series.name_en }
  } catch (err) {
    return { success: false, tmdb_id, error: err.message }
  }
}

// ============================================================
// Main Test
// ============================================================
async function main() {
  console.log('🧪 اختبار المزامنة: 50 فيلم + 10 مسلسلات\n')
  
  // Get 50 movies with is_complete=1
  const movieIds = db.prepare(`
    SELECT tmdb_id FROM movies
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
    LIMIT 50
  `).all().map(r => r.tmdb_id)
  
  console.log(`📊 تم العثور على ${movieIds.length} فيلم في local.db\n`)
  
  // Get 10 series with is_complete=1
  const seriesIds = db.prepare(`
    SELECT tmdb_id FROM tv_series
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
    LIMIT 10
  `).all().map(r => r.tmdb_id)
  
  console.log(`📊 تم العثور على ${seriesIds.length} مسلسل في local.db\n`)
  
  // Sync movies
  console.log('🎬 مزامنة الأفلام...')
  const movieResults = []
  for (const tmdb_id of movieIds) {
    const result = await syncMovie(tmdb_id)
    movieResults.push(result)
    if (result.success) {
      process.stdout.write('✅ ')
    } else {
      process.stdout.write('❌ ')
      console.log(`\n  خطأ في فيلم ${tmdb_id}: ${result.error}`)
    }
  }
  console.log('\n')
  
  // Sync series
  console.log('📺 مزامنة المسلسلات...')
  const seriesResults = []
  for (const tmdb_id of seriesIds) {
    const result = await syncSeries(tmdb_id)
    seriesResults.push(result)
    if (result.success) {
      process.stdout.write('✅ ')
    } else {
      process.stdout.write('❌ ')
      console.log(`\n  خطأ في مسلسل ${tmdb_id}: ${result.error}`)
    }
  }
  console.log('\n')
  
  // Summary
  const movieSuccess = movieResults.filter(r => r.success).length
  const movieFailed = movieResults.filter(r => !r.success).length
  const seriesSuccess = seriesResults.filter(r => r.success).length
  const seriesFailed = seriesResults.filter(r => !r.success).length
  
  console.log('═══════════════════════════════════════════')
  console.log('📊 ملخص النتائج:')
  console.log('═══════════════════════════════════════════')
  console.log(`🎬 الأفلام: ${movieSuccess}/${movieIds.length} نجحوا`)
  console.log(`📺 المسلسلات: ${seriesSuccess}/${seriesIds.length} نجحوا`)
  if (movieFailed > 0 || seriesFailed > 0) {
    console.log(`\n❌ فشل: ${movieFailed} فيلم، ${seriesFailed} مسلسل`)
    console.log('\nالأخطاء:')
    movieResults.filter(r => !r.success).forEach(r => {
      console.log(`  - فيلم ${r.tmdb_id}: ${r.error}`)
    })
    seriesResults.filter(r => !r.success).forEach(r => {
      console.log(`  - مسلسل ${r.tmdb_id}: ${r.error}`)
    })
  }
  
  // Verify samples in Turso
  if (movieSuccess > 0 || seriesSuccess > 0) {
    console.log('\n═══════════════════════════════════════════')
    console.log('🔍 التحقق من البيانات في Turso (عينات)...')
    console.log('═══════════════════════════════════════════\n')
    
    // Sample 1: First successful movie
    const firstMovie = movieResults.find(r => r.success)
    if (firstMovie) {
      console.log(`🎬 عينة 1: فيلم ${firstMovie.title} (${firstMovie.tmdb_id})`)
      const movieData = await turso.execute({
        sql: 'SELECT * FROM movies WHERE tmdb_id = ?',
        args: [firstMovie.tmdb_id]
      })
      if (movieData.rows && movieData.rows.length > 0) {
        const row = movieData.rows[0]
        console.log('───────────────────────────────────────────')
        console.log(`tmdb_id: ${row.tmdb_id}`)
        console.log(`title_ar: ${row.title_ar}`)
        console.log(`title_en: ${row.title_en}`)
        console.log(`original_language: ${row.original_language}`)
        console.log(`genres_json: ${typeof row.genres_json === 'string' ? row.genres_json.substring(0, 100) + '...' : row.genres_json}`)
        console.log(`cast_json: ${typeof row.cast_json === 'string' ? row.cast_json.substring(0, 100) + '...' : row.cast_json}`)
        console.log(`keywords_json: ${row.keywords_json ? (typeof row.keywords_json === 'string' ? 'موجود (string)' : 'موجود (object)') : 'NULL'}`)
        console.log(`companies_json: ${row.companies_json ? (typeof row.companies_json === 'string' ? 'موجود (string)' : 'موجود (object)') : 'NULL'}`)
        console.log('───────────────────────────────────────────\n')
      }
    }
    
    // Sample 2: First successful series
    const firstSeries = seriesResults.find(r => r.success)
    if (firstSeries) {
      console.log(`📺 عينة 2: مسلسل ${firstSeries.title} (${firstSeries.tmdb_id})`)
      const seriesData = await turso.execute({
        sql: 'SELECT * FROM tv_series WHERE tmdb_id = ?',
        args: [firstSeries.tmdb_id]
      })
      if (seriesData.rows && seriesData.rows.length > 0) {
        const row = seriesData.rows[0]
        console.log('───────────────────────────────────────────')
        console.log(`tmdb_id: ${row.tmdb_id}`)
        console.log(`name_ar: ${row.name_ar}`)
        console.log(`name_en: ${row.name_en}`)
        console.log(`number_of_seasons: ${row.number_of_seasons}`)
        console.log(`number_of_episodes: ${row.number_of_episodes}`)
        console.log(`genres_json: ${typeof row.genres_json === 'string' ? row.genres_json.substring(0, 100) + '...' : row.genres_json}`)
        console.log(`cast_json: ${typeof row.cast_json === 'string' ? row.cast_json.substring(0, 100) + '...' : row.cast_json}`)
        console.log(`seasons_json: ${row.seasons_json ? (typeof row.seasons_json === 'string' ? 'موجود (' + row.seasons_json.length + ' حرف)' : 'موجود (object)') : 'NULL'}`)
        console.log(`episodes_json: ${row.episodes_json ? (typeof row.episodes_json === 'string' ? 'موجود (' + row.episodes_json.length + ' حرف)' : 'موجود (object)') : 'NULL'}`)
        console.log('───────────────────────────────────────────\n')
      }
    }
    
    // Sample 3: Third successful item (movie or series)
    const thirdSuccess = [...movieResults, ...seriesResults].filter(r => r.success)[2]
    if (thirdSuccess) {
      const isMovie = movieResults.includes(thirdSuccess)
      console.log(`${isMovie ? '🎬' : '📺'} عينة 3: ${thirdSuccess.title} (${thirdSuccess.tmdb_id})`)
      const table = isMovie ? 'movies' : 'tv_series'
      const itemData = await turso.execute({
        sql: `SELECT * FROM ${table} WHERE tmdb_id = ?`,
        args: [thirdSuccess.tmdb_id]
      })
      if (itemData.rows && itemData.rows.length > 0) {
        const row = itemData.rows[0]
        console.log('───────────────────────────────────────────')
        Object.keys(row).forEach(key => {
          const value = row[key]
          if (typeof value === 'string' && value.length > 100) {
            console.log(`${key}: ${value.substring(0, 100)}...`)
          } else if (value === null) {
            console.log(`${key}: NULL`)
          } else {
            console.log(`${key}: ${value}`)
          }
        })
        console.log('───────────────────────────────────────────\n')
      }
    }
  }
  
  console.log('✅ انتهى الاختبار')
  
  // Exit with error code if any failures
  if (movieFailed > 0 || seriesFailed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ خطأ فادح:', err)
  process.exit(1)
})
