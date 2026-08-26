#!/usr/bin/env node
/**
 * Precompute genre list caches for first page top-rated and genre filtering
 * Eliminates expensive genres_json LIKE queries and full table ORDER BY vote_average scans
 * 
 * Strategy:
 * - Top rated: ORDER BY vote_average DESC, vote_count DESC LIMIT 300
 * - Genre lists: Paginate source table, parse genres_json in Node, keep top 300 by popularity per genre
 * - Zero json_each on D1
 * - Batch INSERT OR REPLACE with retry on 429
 */

const https = require('https')
const fs = require('fs')

const ACCOUNT_ID = '834bca43d616c73db23cf95311cfe17e'
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6'
const API_TOKEN = process.env.CLOUDFLARE_D1_TOKEN

if (!API_TOKEN) {
  console.error('❌ CLOUDFLARE_D1_TOKEN not set')
  process.exit(1)
}

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`

// Retry helper for 429/7429 and timeouts
async function d1Request(sql, params = [], retries = 6) {
  const delays = [5000, 10000, 20000, 30000, 45000, 60000]
  
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const body = JSON.stringify({ sql, params })
        const options = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        }

        const req = https.request(`${BASE_URL}/query`, options, (res) => {
          let data = ''
          res.on('data', chunk => data += chunk)
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data)
                if (parsed.success) {
                  resolve(parsed.result[0].results || [])
                } else {
                  reject(new Error(`D1 error: ${JSON.stringify(parsed.errors)}`))
                }
              } catch (e) {
                reject(new Error(`Parse error: ${e.message}`))
              }
            } else if (res.statusCode === 429) {
              reject({ retry: true, status: 429 })
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`))
            }
          })
        })

        req.on('error', (e) => {
          if (e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET') {
            reject({ retry: true, error: e.message })
          } else {
            reject(e)
          }
        })

        req.setTimeout(45000)
        req.write(body)
        req.end()
      })

      return result
    } catch (err) {
      if (err.retry && i < retries) {
        const delay = delays[i]
        console.log(`⏳ Retry ${i + 1}/${retries} after ${delay}ms (${err.status || err.error})`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        throw err
      }
    }
  }
}

// Batch insert with INSERT OR REPLACE
async function batchInsert(table, columns, rows, batchSize = 8) {
  if (rows.length === 0) return 0

  const placeholders = columns.map(() => '?').join(',')
  const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`

  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    for (const row of batch) {
      try {
        await d1Request(sql, row)
        inserted++
      } catch (err) {
        console.error(`❌ Failed to insert row ${i}: ${err.message}`)
        throw err
      }
    }
    
    if ((i + batchSize) % 100 === 0 || i + batchSize >= rows.length) {
      console.log(`   Inserted ${Math.min(i + batchSize, rows.length)}/${rows.length}`)
    }
  }

  return inserted
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Extract genre tmdb_ids from genres_json
function extractGenreIds(genresJson) {
  if (!genresJson) return []
  try {
    const parsed = JSON.parse(genresJson)
    if (Array.isArray(parsed)) {
      return parsed.map(g => g.tmdb_id).filter(id => typeof id === 'number')
    }
  } catch (e) {
    // Invalid JSON
  }
  return []
}

async function main() {
  console.log('🚀 Starting genre list precomputation...\n')

  console.log('📊 Tables already created, proceeding with data population...\n')

  // 1. Top rated movies
  console.log('🎬 Fetching top rated movies...')
  const topMovies = await d1Request(
    `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path,
            vote_average, release_year, overview_ar, genres_json, tmdb_id
     FROM movies
     WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL
     ORDER BY vote_average DESC, vote_count DESC
     LIMIT 300`,
    []
  )
  console.log(`   Found ${topMovies.length} movies`)

  console.log('   Inserting top rated movies...')
  const movieRows = topMovies.map((m, idx) => [
    idx + 1, // rank
    m.id,
    m.slug,
    m.title_ar,
    m.title_en,
    m.poster_path,
    m.backdrop_path,
    m.vote_average,
    m.release_year,
    m.overview_ar,
    m.genres_json,
    m.tmdb_id
  ])
  await batchInsert(
    'list_movies_top_rated',
    ['rank', 'id', 'slug', 'title_ar', 'title_en', 'poster_path', 'backdrop_path', 'vote_average', 'release_year', 'overview_ar', 'genres_json', 'tmdb_id'],
    movieRows,
    8
  )
  console.log('✅ Top rated movies inserted\n')

  // 2. Top rated series
  console.log('📺 Fetching top rated series...')
  const topSeries = await d1Request(
    `SELECT id, slug, name_ar, name_en, poster_path, backdrop_path,
            vote_average, first_air_year, overview_ar, genres_json, tmdb_id
     FROM tv_series
     WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL
     ORDER BY vote_average DESC, vote_count DESC
     LIMIT 300`,
    []
  )
  console.log(`   Found ${topSeries.length} series`)

  console.log('   Inserting top rated series...')
  const seriesRows = topSeries.map((s, idx) => [
    idx + 1, // rank
    s.id,
    s.slug,
    s.name_ar,
    s.name_en,
    s.poster_path,
    s.backdrop_path,
    s.vote_average,
    s.first_air_year,
    s.overview_ar,
    s.genres_json,
    s.tmdb_id
  ])
  await batchInsert(
    'list_series_top_rated',
    ['rank', 'id', 'slug', 'name_ar', 'name_en', 'poster_path', 'backdrop_path', 'vote_average', 'first_air_year', 'overview_ar', 'genres_json', 'tmdb_id'],
    seriesRows,
    8
  )
  console.log('✅ Top rated series inserted\n')

  // 3. Genre movies - paginated extraction
  console.log('🎬 Processing movies by genre...')
  const genreMoviesMap = new Map() // genre_tmdb_id -> [{item, popularity}, ...]
  let lastId = 0
  let pageCount = 0

  while (true) {
    const batch = await d1Request(
      `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path,
              vote_average, release_year, overview_ar, genres_json, tmdb_id, popularity
       FROM movies
       WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL AND id > ?
       ORDER BY id ASC
       LIMIT 200`,
      [lastId]
    )

    if (batch.length === 0) break
    pageCount++

    for (const movie of batch) {
      const genreIds = extractGenreIds(movie.genres_json)
      for (const gid of genreIds) {
        if (!genreMoviesMap.has(gid)) {
          genreMoviesMap.set(gid, [])
        }
        genreMoviesMap.get(gid).push({
          item: movie,
          popularity: movie.popularity || 0
        })
      }
    }

    lastId = batch[batch.length - 1].id
    console.log(`   Page ${pageCount}: processed up to id ${lastId}, genres: ${genreMoviesMap.size}`)
  }

  console.log(`   Total genre IDs found: ${genreMoviesMap.size}`)

  // Keep top 300 per genre by popularity
  console.log('   Sorting and limiting to top 300 per genre...')
  for (const [gid, items] of genreMoviesMap.entries()) {
    items.sort((a, b) => b.popularity - a.popularity)
    genreMoviesMap.set(gid, items.slice(0, 300))
  }

  // Insert genre movies
  console.log('   Inserting genre movies...')
  let genreMovieTotal = 0
  for (const [gid, items] of genreMoviesMap.entries()) {
    const rows = items.map((entry, idx) => {
      const m = entry.item
      return [
        gid,
        idx + 1,
        m.id,
        m.slug,
        m.title_ar,
        m.title_en,
        m.poster_path,
        m.backdrop_path,
        m.vote_average,
        m.release_year,
        m.overview_ar,
        m.genres_json,
        m.tmdb_id,
        m.popularity
      ]
    })

    await batchInsert(
      'list_movies_genre',
      ['genre_tmdb_id', 'rank', 'id', 'slug', 'title_ar', 'title_en', 'poster_path', 'backdrop_path', 'vote_average', 'release_year', 'overview_ar', 'genres_json', 'tmdb_id', 'popularity'],
      rows,
      8
    )
    genreMovieTotal += rows.length
  }
  console.log(`✅ Inserted ${genreMovieTotal} genre movie entries across ${genreMoviesMap.size} genres\n`)

  // 4. Genre series - paginated extraction
  console.log('📺 Processing series by genre...')
  const genreSeriesMap = new Map()
  lastId = 0
  pageCount = 0

  while (true) {
    const batch = await d1Request(
      `SELECT id, slug, name_ar, name_en, poster_path, backdrop_path,
              vote_average, first_air_year, overview_ar, genres_json, tmdb_id, popularity
       FROM tv_series
       WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL AND id > ?
       ORDER BY id ASC
       LIMIT 200`,
      [lastId]
    )

    if (batch.length === 0) break
    pageCount++

    for (const series of batch) {
      const genreIds = extractGenreIds(series.genres_json)
      for (const gid of genreIds) {
        if (!genreSeriesMap.has(gid)) {
          genreSeriesMap.set(gid, [])
        }
        genreSeriesMap.get(gid).push({
          item: series,
          popularity: series.popularity || 0
        })
      }
    }

    lastId = batch[batch.length - 1].id
    console.log(`   Page ${pageCount}: processed up to id ${lastId}, genres: ${genreSeriesMap.size}`)
  }

  console.log(`   Total genre IDs found: ${genreSeriesMap.size}`)

  // Keep top 300 per genre by popularity
  console.log('   Sorting and limiting to top 300 per genre...')
  for (const [gid, items] of genreSeriesMap.entries()) {
    items.sort((a, b) => b.popularity - a.popularity)
    genreSeriesMap.set(gid, items.slice(0, 300))
  }

  // Insert genre series
  console.log('   Inserting genre series...')
  let genreSeriesTotal = 0
  for (const [gid, items] of genreSeriesMap.entries()) {
    const rows = items.map((entry, idx) => {
      const s = entry.item
      return [
        gid,
        idx + 1,
        s.id,
        s.slug,
        s.name_ar,
        s.name_en,
        s.poster_path,
        s.backdrop_path,
        s.vote_average,
        s.first_air_year,
        s.overview_ar,
        s.genres_json,
        s.tmdb_id,
        s.popularity
      ]
    })

    await batchInsert(
      'list_series_genre',
      ['genre_tmdb_id', 'rank', 'id', 'slug', 'name_ar', 'name_en', 'poster_path', 'backdrop_path', 'vote_average', 'first_air_year', 'overview_ar', 'genres_json', 'tmdb_id', 'popularity'],
      rows,
      8
    )
    genreSeriesTotal += rows.length
  }
  console.log(`✅ Inserted ${genreSeriesTotal} genre series entries across ${genreSeriesMap.size} genres\n`)

  // Final counts
  console.log('📊 Final counts:')
  const topMoviesCount = await d1Request('SELECT COUNT(*) as c FROM list_movies_top_rated', [])
  const topSeriesCount = await d1Request('SELECT COUNT(*) as c FROM list_series_top_rated', [])
  const genreMoviesCount = await d1Request('SELECT COUNT(*) as c FROM list_movies_genre', [])
  const genreSeriesCount = await d1Request('SELECT COUNT(*) as c FROM list_series_genre', [])
  const genreMoviesIds = await d1Request('SELECT COUNT(DISTINCT genre_tmdb_id) as c FROM list_movies_genre', [])
  const genreSeriesIds = await d1Request('SELECT COUNT(DISTINCT genre_tmdb_id) as c FROM list_series_genre', [])

  console.log(`   list_movies_top_rated: ${topMoviesCount[0]?.c || 0}`)
  console.log(`   list_series_top_rated: ${topSeriesCount[0]?.c || 0}`)
  console.log(`   list_movies_genre: ${genreMoviesCount[0]?.c || 0} (${genreMoviesIds[0]?.c || 0} genres)`)
  console.log(`   list_series_genre: ${genreSeriesCount[0]?.c || 0} (${genreSeriesIds[0]?.c || 0} genres)`)

  console.log('\n✅ Genre list precomputation complete!')
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
