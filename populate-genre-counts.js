/**
 * Populate genre_counts table with current statistics
 * Run this once now, then attach to sync/ingestion scripts for updates
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function populateCounts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  حساب أعداد الـ Genres')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Get all genres
  const genresResult = await turso.execute('SELECT tmdb_id, name_ar FROM genres ORDER BY name_ar')
  console.log(`📊 Found ${genresResult.rows.length} genres\n`)

  // Clear existing counts
  await turso.execute('DELETE FROM genre_counts')
  console.log('🗑️  Cleared old counts\n')

  const startTotal = Date.now()
  let processed = 0

  for (const genre of genresResult.rows) {
    const genreId = genre.tmdb_id
    const genreName = genre.name_ar

    console.log(`Processing ${genreName} (ID: ${genreId})...`)
    const start = Date.now()

    // Count movies for this genre
    const movieCountResult = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM movies m
            WHERE EXISTS (
              SELECT 1 FROM json_each(m.genres_json)
              WHERE CAST(json_extract(value, '$.tmdb_id') AS INTEGER) = ?
            )`,
      args: [genreId]
    })
    const movieCount = movieCountResult.rows[0].count

    // Count series for this genre
    const seriesCountResult = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM tv_series s
            WHERE EXISTS (
              SELECT 1 FROM json_each(s.genres_json)
              WHERE CAST(json_extract(value, '$.tmdb_id') AS INTEGER) = ?
            )`,
      args: [genreId]
    })
    const seriesCount = seriesCountResult.rows[0].count

    const duration = Date.now() - start

    // Insert into genre_counts
    await turso.execute({
      sql: `INSERT INTO genre_counts (genre_id, movie_count, series_count, updated_at)
            VALUES (?, ?, ?, datetime('now'))`,
      args: [genreId, movieCount, seriesCount]
    })

    console.log(`  ✅ ${movieCount} movies, ${seriesCount} series (${duration}ms)`)
    processed++
  }

  const totalDuration = Date.now() - startTotal

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Processed ${processed} genres in ${(totalDuration / 1000).toFixed(2)}s`)
  console.log(`   Average: ${(totalDuration / processed).toFixed(0)}ms per genre`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Show sample results
  const sample = await turso.execute(`
    SELECT g.name_ar, gc.movie_count, gc.series_count, 
           (gc.movie_count + gc.series_count) as total
    FROM genres g
    JOIN genre_counts gc ON gc.genre_id = g.tmdb_id
    ORDER BY total DESC
    LIMIT 10
  `)

  console.log('📊 Top 10 Genres by Total Count:')
  console.log('─'.repeat(79))
  sample.rows.forEach((row, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${row.name_ar.padEnd(20)} ${row.movie_count.toString().padStart(6)} movies + ${row.series_count.toString().padStart(5)} series = ${row.total.toString().padStart(6)} total`)
  })
  console.log('─'.repeat(79) + '\n')

  turso.close()
}

populateCounts().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
