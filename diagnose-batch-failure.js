#!/usr/bin/env node
/**
 * Diagnostic Script: Test why batch fails for series
 * Safe test - uses existing synced series (will just UPDATE them)
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const path = require('path')

const localDbPath = path.join(__dirname, 'data', '4cima-local.db')
const localDb = new Database(localDbPath, { readonly: true })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const BATCH_SIZE = 5  // Small batch for testing

function toJsonOrNull(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return null
}

async function testSeriesBatch() {
  console.log('═'.repeat(80))
  console.log('DIAGNOSTIC TEST - TV SERIES BATCH')
  console.log('═'.repeat(80))
  console.log('')

  try {
    // Get 5 series that are already complete and clean
    // (will test on existing data to be safe)
    const testIds = localDb.prepare(`
      SELECT tmdb_id FROM tv_series
      WHERE is_complete = 1 AND filter_status = 'clean'
      LIMIT ?
    `).all(BATCH_SIZE).map(r => r.tmdb_id)

    console.log(`Testing with ${testIds.length} series:`)
    testIds.forEach(id => console.log(`  - tmdb_id: ${id}`))
    console.log('')

    // Build statements (same as production code)
    const statements = []
    
    for (const tmdb_id of testIds) {
      const series = localDb.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(tmdb_id)
      if (!series) continue
      
      const genres = localDb.prepare(`
        SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
        FROM genres g
        JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
        WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
      `).all(tmdb_id)
      
      const cast = localDb.prepare(`
        SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
               cc.character_name, cc.cast_order
        FROM people p
        JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
        WHERE cc.content_tmdb_id = ? AND cc.content_type = 'tv'
          AND cc.role_type = 'cast'
        ORDER BY cc.cast_order
        LIMIT 10
      `).all(tmdb_id)
      
      const seasons = localDb.prepare(`
        SELECT season_number, name_en, episode_count, air_date, poster_path
        FROM seasons WHERE series_tmdb_id = ?
        ORDER BY season_number
      `).all(tmdb_id)
      
      const episodes = localDb.prepare(`
        SELECT season_number, episode_number, name_en, overview_en,
               still_path, air_date, runtime, vote_average
        FROM episodes WHERE series_tmdb_id = ?
        ORDER BY season_number, episode_number
      `).all(tmdb_id)
      
      // Calculate payload size
      const genresSize = JSON.stringify(genres).length
      const castSize = JSON.stringify(cast).length
      const seasonsSize = JSON.stringify(seasons).length
      const episodesSize = JSON.stringify(episodes).length
      const totalSize = genresSize + castSize + seasonsSize + episodesSize
      
      console.log(`Series ${tmdb_id} payload:`)
      console.log(`  genres: ${genresSize} bytes`)
      console.log(`  cast: ${castSize} bytes`)
      console.log(`  seasons: ${seasonsSize} bytes (${seasons.length} seasons)`)
      console.log(`  episodes: ${episodesSize} bytes (${episodes.length} episodes)`)
      console.log(`  TOTAL: ${totalSize} bytes`)
      console.log('')
      
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

    console.log(`Built ${statements.length} statements`)
    console.log('Attempting batch insert to Turso...')
    console.log('')

    // Try batch
    try {
      const startTime = Date.now()
      await turso.batch(statements, 'write')
      const duration = Date.now() - startTime
      
      console.log('✅ BATCH SUCCEEDED!')
      console.log(`   Duration: ${duration}ms`)
      console.log(`   Statements: ${statements.length}`)
      console.log('')
      
    } catch (err) {
      console.log('❌ BATCH FAILED!')
      console.log('═'.repeat(80))
      console.log('ERROR DETAILS:')
      console.log('─'.repeat(80))
      console.log('Message:', err.message)
      console.log('Code:', err.code)
      console.log('Name:', err.name)
      console.log('')
      console.log('Stack:')
      console.log(err.stack)
      console.log('═'.repeat(80))
      console.log('')
      console.log('Full error object:')
      console.log(JSON.stringify(err, null, 2))
      console.log('')
    }

  } catch (error) {
    console.error('FATAL ERROR:', error.message)
    console.error(error.stack)
  } finally {
    localDb.close()
    turso.close()
  }
}

testSeriesBatch()
