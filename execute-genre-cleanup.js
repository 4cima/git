#!/usr/bin/env node
/**
 * Execute full genre cleanup for news, talk, documentary, and reality
 * 
 * Steps:
 * 1. Get exact counts for each genre (ONLY-genre matches)
 * 2. Delete matching rows from Turso in batches
 * 3. Verify deletion (confirm 0 remaining)
 * 4. Report before/after counts
 */

import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const TARGET_GENRES = [
  { name: 'News', slug: 'news', nameAr: 'أخبار' },
  { name: 'Talk', slug: 'talk', nameAr: 'برنامج حواري' },
  { name: 'Documentary', slug: 'documentary', nameAr: 'وثائقي' },
  { name: 'Reality', slug: 'reality', nameAr: 'واقعي' },
]

console.log('🗑️  GENRE CLEANUP EXECUTION\n')
console.log('Target genres: news, talk, documentary, reality')
console.log('Rule: ONLY-genre-match (single-genre items only)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

async function executeCleanup() {
  // ============================================================================
  // STEP 1: Get exact counts BEFORE deletion
  // ============================================================================
  console.log('📊 STEP 1: Getting exact counts before deletion...\n')

  const beforeCounts = {
    movies: {},
    series: {},
    totals: { movies: 0, series: 0 }
  }

  // Get total counts before cleanup
  const totalMoviesBefore = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const totalSeriesBefore = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  beforeCounts.totals.movies = totalMoviesBefore.rows[0].count
  beforeCounts.totals.series = totalSeriesBefore.rows[0].count

  console.log('Current database size:')
  console.log(`  Movies: ${beforeCounts.totals.movies.toLocaleString()}`)
  console.log(`  Series: ${beforeCounts.totals.series.toLocaleString()}`)
  console.log(`  Total: ${(Number(beforeCounts.totals.movies) + Number(beforeCounts.totals.series)).toLocaleString()}\n`)

  // Get counts for each genre
  for (const genre of TARGET_GENRES) {
    // Movies
    const moviesCount = await turso.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM movies
        WHERE genres_json LIKE ?
        AND json_array_length(genres_json) = 1
      `,
      args: [`%"slug":"${genre.slug}"%`]
    })
    beforeCounts.movies[genre.name] = moviesCount.rows[0].count

    // Series
    const seriesCount = await turso.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM tv_series
        WHERE genres_json LIKE ?
        AND json_array_length(genres_json) = 1
      `,
      args: [`%"slug":"${genre.slug}"%`]
    })
    beforeCounts.series[genre.name] = seriesCount.rows[0].count

    const total = Number(beforeCounts.movies[genre.name]) + Number(beforeCounts.series[genre.name])
    console.log(`${genre.name}:`)
    console.log(`  Movies: ${beforeCounts.movies[genre.name].toLocaleString()}`)
    console.log(`  Series: ${beforeCounts.series[genre.name].toLocaleString()}`)
    console.log(`  Total: ${total.toLocaleString()}`)
  }

  const grandTotal = TARGET_GENRES.reduce((sum, genre) => {
    return sum + Number(beforeCounts.movies[genre.name]) + Number(beforeCounts.series[genre.name])
  }, 0)

  console.log(`\n🎯 Total items to delete: ${grandTotal.toLocaleString()}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // ============================================================================
  // STEP 2: Delete from Turso in batches
  // ============================================================================
  console.log('🗑️  STEP 2: Deleting rows from Turso...\n')

  let totalDeleted = { movies: 0, series: 0 }

  for (const genre of TARGET_GENRES) {
    const moviesCount = Number(beforeCounts.movies[genre.name])
    const seriesCount = Number(beforeCounts.series[genre.name])

    if (moviesCount > 0) {
      console.log(`Deleting ${moviesCount.toLocaleString()} movies with ONLY ${genre.name} genre...`)
      const deleteMovies = await turso.execute({
        sql: `
          DELETE FROM movies
          WHERE genres_json LIKE ?
          AND json_array_length(genres_json) = 1
        `,
        args: [`%"slug":"${genre.slug}"%`]
      })
      totalDeleted.movies += deleteMovies.rowsAffected
      console.log(`  ✅ Deleted ${deleteMovies.rowsAffected.toLocaleString()} movies`)
    }

    if (seriesCount > 0) {
      console.log(`Deleting ${seriesCount.toLocaleString()} series with ONLY ${genre.name} genre...`)
      const deleteSeries = await turso.execute({
        sql: `
          DELETE FROM tv_series
          WHERE genres_json LIKE ?
          AND json_array_length(genres_json) = 1
        `,
        args: [`%"slug":"${genre.slug}"%`]
      })
      totalDeleted.series += deleteSeries.rowsAffected
      console.log(`  ✅ Deleted ${deleteSeries.rowsAffected.toLocaleString()} series`)
    }

    if (moviesCount === 0 && seriesCount === 0) {
      console.log(`${genre.name}: No items to delete (skipped)`)
    }

    console.log()
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Total deleted:')
  console.log(`  Movies: ${totalDeleted.movies.toLocaleString()}`)
  console.log(`  Series: ${totalDeleted.series.toLocaleString()}`)
  console.log(`  Total: ${(totalDeleted.movies + totalDeleted.series).toLocaleString()}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // ============================================================================
  // STEP 3: Verify deletion (confirm 0 remaining)
  // ============================================================================
  console.log('✅ STEP 3: Verifying deletion...\n')

  let allClean = true

  for (const genre of TARGET_GENRES) {
    // Check movies
    const moviesRemaining = await turso.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM movies
        WHERE genres_json LIKE ?
        AND json_array_length(genres_json) = 1
      `,
      args: [`%"slug":"${genre.slug}"%`]
    })

    // Check series
    const seriesRemaining = await turso.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM tv_series
        WHERE genres_json LIKE ?
        AND json_array_length(genres_json) = 1
      `,
      args: [`%"slug":"${genre.slug}"%`]
    })

    const moviesCount = Number(moviesRemaining.rows[0].count)
    const seriesCount = Number(seriesRemaining.rows[0].count)
    const isClean = moviesCount === 0 && seriesCount === 0

    console.log(`${genre.name}: ${isClean ? '✅' : '❌'} ${moviesCount} movies, ${seriesCount} series remaining`)

    if (!isClean) allClean = false
  }

  if (allClean) {
    console.log('\n✅ All genres cleaned successfully - 0 single-genre items remaining')
  } else {
    console.log('\n⚠️  WARNING: Some items still remain after deletion')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // ============================================================================
  // STEP 4: Report final counts (before vs after)
  // ============================================================================
  console.log('📊 STEP 4: Final database counts (BEFORE → AFTER)\n')

  const totalMoviesAfter = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const totalSeriesAfter = await turso.execute('SELECT COUNT(*) as count FROM tv_series')

  const moviesAfter = Number(totalMoviesAfter.rows[0].count)
  const seriesAfter = Number(totalSeriesAfter.rows[0].count)
  const moviesBefore = Number(beforeCounts.totals.movies)
  const seriesBefore = Number(beforeCounts.totals.series)

  console.log('Movies:')
  console.log(`  Before: ${moviesBefore.toLocaleString()}`)
  console.log(`  After:  ${moviesAfter.toLocaleString()}`)
  console.log(`  Deleted: ${(moviesBefore - moviesAfter).toLocaleString()} (${((moviesBefore - moviesAfter) / moviesBefore * 100).toFixed(2)}%)`)

  console.log('\nSeries:')
  console.log(`  Before: ${seriesBefore.toLocaleString()}`)
  console.log(`  After:  ${seriesAfter.toLocaleString()}`)
  console.log(`  Deleted: ${(seriesBefore - seriesAfter).toLocaleString()} (${((seriesBefore - seriesAfter) / seriesBefore * 100).toFixed(2)}%)`)

  console.log('\nTotal:')
  console.log(`  Before: ${(moviesBefore + seriesBefore).toLocaleString()}`)
  console.log(`  After:  ${(moviesAfter + seriesAfter).toLocaleString()}`)
  console.log(`  Deleted: ${(moviesBefore + seriesBefore - moviesAfter - seriesAfter).toLocaleString()} (${((moviesBefore + seriesBefore - moviesAfter - seriesAfter) / (moviesBefore + seriesBefore) * 100).toFixed(2)}%)`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  return {
    beforeCounts,
    totalDeleted,
    moviesAfter,
    seriesAfter,
    allClean
  }
}

executeCleanup()
  .then((result) => {
    console.log('✅ Turso cleanup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Update scripts/1-fetch-and-enrich.js isComplete condition')
    console.log('   2. Filter local SQLite database')
    console.log('   3. Commit changes\n')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Error during cleanup:', err)
    process.exit(1)
  })
