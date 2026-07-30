#!/usr/bin/env node
/**
 * Benchmark: Measure actual sync speed for TV series
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

const BATCH_SIZE = 100

function toJsonOrNull(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return null
}

async function benchmarkBatch() {
  console.log('═'.repeat(80))
  console.log('SYNC SPEED BENCHMARK')
  console.log('═'.repeat(80))
  console.log('')

  try {
    // Get 100 series to test
    const testIds = localDb.prepare(`
      SELECT tmdb_id FROM tv_series
      WHERE is_complete = 1 AND filter_status = 'clean' AND synced_to_turso = 0
      LIMIT ?
    `).all(BATCH_SIZE).map(r => r.tmdb_id)

    console.log(`Testing with ${testIds.length} series`)
    console.log('')

    // Build statements
    console.log('Building statements...')
    const buildStart = Date.now()
    const statements = []
    let totalPayloadSize = 0
    let maxEpisodesCount = 0
    let maxEpisodesId = null
    
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
      
      // Track largest episodes
      if (episodes.length > maxEpisodesCount) {
        maxEpisodesCount = episodes.length
        maxEpisodesId = tmdb_id
      }
      
      const episodesJson = JSON.stringify(episodes)
      totalPayloadSize += episodesJson.length
      
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
          episodesJson,
          series.seo_title_ar, series.seo_description_ar, toJsonOrNull(series.seo_keywords_json),
          series.canonical_url,
          series.created_at, series.updated_at,
          series.filter_status
        ]
      })
    }
    
    const buildTime = Date.now() - buildStart
    console.log(`✅ Built ${statements.length} statements in ${buildTime}ms`)
    console.log('')
    
    // Payload analysis
    console.log('Payload Analysis:')
    console.log(`  Total episodes_json size: ${(totalPayloadSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Average per series: ${(totalPayloadSize / statements.length / 1024).toFixed(2)} KB`)
    console.log(`  Max episodes in one series: ${maxEpisodesCount} episodes (tmdb_id: ${maxEpisodesId})`)
    console.log('')
    
    // Test batch insert
    console.log('Testing batch insert to Turso...')
    const batchStart = Date.now()
    
    try {
      await turso.batch(statements, 'write')
      const batchTime = Date.now() - batchStart
      
      console.log(`✅ Batch succeeded in ${(batchTime / 1000).toFixed(2)} seconds`)
      console.log(`   Speed: ${(statements.length / (batchTime / 1000)).toFixed(2)} series/second`)
      console.log(`   Throughput: ${(totalPayloadSize / 1024 / (batchTime / 1000)).toFixed(2)} KB/second`)
      
    } catch (err) {
      console.log(`❌ Batch failed: ${err.message}`)
      console.log('   Trying individual inserts for comparison...')
      
      const individualStart = Date.now()
      let success = 0
      let failed = 0
      
      for (let i = 0; i < Math.min(10, statements.length); i++) {
        try {
          await turso.execute(statements[i])
          success++
        } catch (e) {
          failed++
        }
      }
      
      const individualTime = Date.now() - individualStart
      console.log(`   Individual inserts (10 samples): ${individualTime}ms`)
      console.log(`   Success: ${success}, Failed: ${failed}`)
      console.log(`   Estimated time for 100: ${(individualTime * 10).toFixed(0)}ms`)
    }
    
    console.log('')
    console.log('═'.repeat(80))
    console.log('PROJECTIONS')
    console.log('═'.repeat(80))
    console.log('')
    
    const batchTime = Date.now() - batchStart
    const timePerBatch = batchTime / 1000 // seconds
    const remaining = 52677 // series remaining
    const batchesNeeded = Math.ceil(remaining / BATCH_SIZE)
    const estimatedTotal = batchesNeeded * timePerBatch
    
    console.log(`Remaining series to sync: ${remaining.toLocaleString('en-US')}`)
    console.log(`Batches needed: ${batchesNeeded.toLocaleString('en-US')}`)
    console.log(`Time per batch: ${timePerBatch.toFixed(2)}s`)
    console.log(`Estimated total time: ${(estimatedTotal / 60).toFixed(2)} minutes`)
    console.log(`Estimated total time: ${(estimatedTotal / 3600).toFixed(2)} hours`)
    
  } catch (error) {
    console.error('Error:', error.message)
    console.error(error.stack)
  } finally {
    localDb.close()
    turso.close()
  }
}

benchmarkBatch()
