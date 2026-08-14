#!/usr/bin/env node
/**
 * Script 3: Sync to Turso
 * Syncs local database to Turso production
 * FIXED: Added original_language, proper JSON handling for all columns
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { createClient } = require('@libsql/client')
const db = require('./services/local-db')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const BATCH_SIZE = 100

// ============================================================
// Helper: Convert value to JSON or null
// ============================================================
function toJsonOrNull(value) {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    // Already a JSON string, return as-is
    return value
  }
  if (typeof value === 'object') {
    // Object or array, stringify it
    return JSON.stringify(value)
  }
  // Primitive types that shouldn't be JSON columns
  return null
}

// ============================================================
// Movies Sync
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
    // لو فشل الـ batch كله، حاول واحد واحد
    console.error(`Batch failed, trying individually...`)
    let synced = 0
    for (const stmt of statements) {
      try {
        await turso.execute(stmt)
        synced++
      } catch (e) {
        console.error(`Failed tmdb_id: ${stmt.args[0]}`, e.message)
      }
    }
    return synced
  }
}

// ============================================================
// TV Series Sync
// ============================================================
async function syncSeriesBatch(seriesIds) {
  const statements = []
  const skipped = []
  
  for (const tmdb_id of seriesIds) {
    const series = db.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(tmdb_id)
    if (!series) continue
    
    // Skip series with NULL slug - cannot sync
    if (!series.slug) {
      skipped.push({ tmdb_id, reason: 'NULL slug', name: series.name_en })
      // Mark as synced to avoid infinite retry loop
      db.prepare('UPDATE tv_series SET synced_to_turso = 1 WHERE tmdb_id = ?').run(tmdb_id)
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
      skipped.forEach(s => console.log(`  ⚠️  Skipped tmdb_id ${s.tmdb_id} (${s.reason}): ${s.name}`))
    }
    return 0
  }
  
  try {
    await turso.batch(statements, 'write')
    
    const placeholders = seriesIds.map(() => '?').join(',')
    db.prepare(`
      UPDATE tv_series SET synced_to_turso = 1, synced_at = datetime('now')
      WHERE tmdb_id IN (${placeholders})
    `).run(...seriesIds)
    
    return statements.length
  } catch (err) {
    console.error(`Series batch failed, trying individually...`)
    let synced = 0
    for (const stmt of statements) {
      try {
        await turso.execute(stmt)
        synced++
      } catch (e) {
        console.error(`Failed series tmdb_id: ${stmt.args[0]}`, e.message)
      }
    }
    return synced
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('🚀 بدء المزامنة مع Turso...\n')
  
  const stats = { movies: 0, series: 0, errors: 0 }
  
  // Sync Movies
  console.log('🎬 مزامنة الأفلام...')
  while (true) {
    const batch = db.prepare(`
      SELECT tmdb_id FROM movies
      WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') AND synced_to_turso = 0
      LIMIT ?
    `).all(BATCH_SIZE).map(r => r.tmdb_id)
    
    if (batch.length === 0) break
    
    const synced = await syncMoviesBatch(batch)
    stats.movies += synced
    console.log(`  ✅ ${stats.movies} فيلم`)
  }
  
  // Sync TV Series
  console.log('\n📺 مزامنة المسلسلات...')
  while (true) {
    const batch = db.prepare(`
      SELECT tmdb_id FROM tv_series
      WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') AND synced_to_turso = 0
      LIMIT ?
    `).all(BATCH_SIZE).map(r => r.tmdb_id)
    
    if (batch.length === 0) break
    
    const synced = await syncSeriesBatch(batch)
    stats.series += synced
    console.log(`  ✅ ${stats.series} مسلسل`)
  }
  
  console.log(`\n✅ اكتملت المزامنة!`)
  console.log(`   أفلام: ${stats.movies}`)
  console.log(`   مسلسلات: ${stats.series}`)
  
  // Rebuild short_titles_lookup after catalog sync
  await rebuildShortTitles()
}

// ============================================================
// Rebuild short_titles_lookup
// ============================================================
async function rebuildShortTitles() {
  console.log('\n🔄 إعادة بناء جدول short_titles_lookup...')
  try {
    await turso.execute('DELETE FROM short_titles_lookup')
    
    const moviesResult = await turso.execute(`
      INSERT INTO short_titles_lookup (
        source_id, media_type, title_ar, title_en, name_ar, name_en,
        poster_path, release_year, first_air_year, vote_average, 
        popularity, filter_status, slug, title_length
      )
      SELECT 
        id, 'movie', title_ar, title_en, NULL, NULL,
        poster_path, release_year, NULL, vote_average,
        popularity, filter_status, slug,
        CASE 
          WHEN LENGTH(title_ar) IN (1,2) THEN LENGTH(title_ar)
          ELSE LENGTH(title_en)
        END as title_length
      FROM movies
      WHERE LENGTH(title_ar) IN (1,2) OR LENGTH(title_en) IN (1,2)
    `)
    
    const seriesResult = await turso.execute(`
      INSERT INTO short_titles_lookup (
        source_id, media_type, title_ar, title_en, name_ar, name_en,
        poster_path, release_year, first_air_year, vote_average,
        popularity, filter_status, slug, title_length
      )
      SELECT 
        id, 'tv', NULL, NULL, name_ar, name_en,
        poster_path, NULL, first_air_year, vote_average,
        popularity, filter_status, slug,
        CASE 
          WHEN LENGTH(name_ar) IN (1,2) THEN LENGTH(name_ar)
          ELSE LENGTH(name_en)
        END as title_length
      FROM tv_series
      WHERE LENGTH(name_ar) IN (1,2) OR LENGTH(name_en) IN (1,2)
    `)
    
    const countResult = await turso.execute('SELECT COUNT(*) as cnt FROM short_titles_lookup')
    const totalCount = countResult.rows[0].cnt
    
    console.log(`   ✅ ${moviesResult.rowsAffected} أفلام + ${seriesResult.rowsAffected} مسلسلات`)
    console.log(`   📊 إجمالي: ${totalCount} عنوان قصير`)
  } catch (err) {
    console.error(`   ❌ خطأ في إعادة بناء short_titles_lookup:`, err.message)
  }
}

main().catch(console.error)
