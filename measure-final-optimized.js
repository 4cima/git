/**
 * Final measurement with optimized indexes
 * Run twice to verify consistency
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function measureQueries(runNumber) {
  console.log(`\n${'═'.repeat(79)}`)
  console.log(`  RUN #${runNumber}`)
  console.log('═'.repeat(79) + '\n')

  // Query 1: Trending Movies
  const t1 = Date.now()
  const trendingMoviesRes = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies INDEXED BY idx_movies_pop_partial2
          WHERE poster_path IS NOT NULL 
            AND backdrop_path IS NOT NULL 
            AND vote_average > 0
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  const d1 = Date.now() - t1

  // Query 2: Trending Series
  const t2 = Date.now()
  const trendingSeriesRes = await turso.execute({
    sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
          FROM tv_series INDEXED BY idx_series_home_trending
          WHERE poster_path IS NOT NULL 
            AND backdrop_path IS NOT NULL 
            AND vote_average > 0
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  const d2 = Date.now() - t2

  // Query 3: Latest Movies
  const t3 = Date.now()
  const latestRes = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies INDEXED BY idx_movies_home_latest
          WHERE poster_path IS NOT NULL
          ORDER BY release_year DESC, popularity DESC
          LIMIT 50`,
    args: []
  })
  const d3 = Date.now() - t3

  // Query 4: Top Rated Movies
  const t4 = Date.now()
  const topRatedRes = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies INDEXED BY idx_movies_home_toprated
          WHERE poster_path IS NOT NULL 
            AND vote_average >= 7.5
          ORDER BY vote_average DESC
          LIMIT 50`,
    args: []
  })
  const d4 = Date.now() - t4

  // Query 5: Series
  const t5 = Date.now()
  const seriesRes = await turso.execute({
    sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
          FROM tv_series INDEXED BY idx_series_home_all
          WHERE poster_path IS NOT NULL
          ORDER BY popularity DESC
          LIMIT 50`,
    args: []
  })
  const d5 = Date.now() - t5

  console.log(`1️⃣  trendingMovies:  ${d1.toString().padStart(6)}ms (${trendingMoviesRes.rows.length} rows)`)
  console.log(`2️⃣  trendingSeries:  ${d2.toString().padStart(6)}ms (${trendingSeriesRes.rows.length} rows)`)
  console.log(`3️⃣  latest:          ${d3.toString().padStart(6)}ms (${latestRes.rows.length} rows)`)
  console.log(`4️⃣  topRated:        ${d4.toString().padStart(6)}ms (${topRatedRes.rows.length} rows)`)
  console.log(`5️⃣  series:          ${d5.toString().padStart(6)}ms (${seriesRes.rows.length} rows)`)
  console.log(`${'─'.repeat(79)}`)
  console.log(`📊 Sequential Total: ${(d1 + d2 + d3 + d4 + d5).toString().padStart(6)}ms`)
  console.log(`📊 Average:          ${Math.round((d1 + d2 + d3 + d4 + d5) / 5).toString().padStart(6)}ms`)

  // Parallel execution
  const tParallel = Date.now()
  await Promise.all([
    turso.execute({
      sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
            FROM movies INDEXED BY idx_movies_pop_partial2
            WHERE poster_path IS NOT NULL 
              AND backdrop_path IS NOT NULL 
              AND vote_average > 0
            ORDER BY popularity DESC 
            LIMIT 50`,
      args: []
    }),
    turso.execute({
      sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
            FROM tv_series INDEXED BY idx_series_home_trending
            WHERE poster_path IS NOT NULL 
              AND backdrop_path IS NOT NULL 
              AND vote_average > 0
            ORDER BY popularity DESC 
            LIMIT 50`,
      args: []
    }),
    turso.execute({
      sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
            FROM movies INDEXED BY idx_movies_home_latest
            WHERE poster_path IS NOT NULL
            ORDER BY release_year DESC, popularity DESC
            LIMIT 50`,
      args: []
    }),
    turso.execute({
      sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
            FROM movies INDEXED BY idx_movies_home_toprated
            WHERE poster_path IS NOT NULL 
              AND vote_average >= 7.5
            ORDER BY vote_average DESC
            LIMIT 50`,
      args: []
    }),
    turso.execute({
      sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
            FROM tv_series INDEXED BY idx_series_home_all
            WHERE poster_path IS NOT NULL
            ORDER BY popularity DESC
            LIMIT 50`,
      args: []
    })
  ])
  const dParallel = Date.now() - tParallel
  console.log(`⚡ Parallel (Promise.all): ${dParallel.toString().padStart(6)}ms`)

  return { sequential: d1 + d2 + d3 + d4 + d5, parallel: dParallel, individual: [d1, d2, d3, d4, d5] }
}

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  قياس نهائي بعد تحسين الـ Indexes')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const run1 = await measureQueries(1)
  await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2s between runs
  const run2 = await measureQueries(2)

  console.log('\n' + '═'.repeat(79))
  console.log('  COMPARISON')
  console.log('═'.repeat(79) + '\n')

  console.log('📊 Sequential:')
  console.log(`   Run 1: ${run1.sequential}ms`)
  console.log(`   Run 2: ${run2.sequential}ms`)
  console.log(`   Diff:  ${Math.abs(run1.sequential - run2.sequential)}ms (${Math.abs(run1.sequential - run2.sequential) / run1.sequential * 100 < 10 ? '✅' : '⚠️'} ${((run1.sequential - run2.sequential) / run1.sequential * 100).toFixed(1)}%)`)
  
  console.log('\n⚡ Parallel:')
  console.log(`   Run 1: ${run1.parallel}ms`)
  console.log(`   Run 2: ${run2.parallel}ms`)
  console.log(`   Diff:  ${Math.abs(run1.parallel - run2.parallel)}ms (${Math.abs(run1.parallel - run2.parallel) / run1.parallel * 100 < 10 ? '✅' : '⚠️'} ${((run1.parallel - run2.parallel) / run1.parallel * 100).toFixed(1)}%)`)

  console.log('\n' + '═'.repeat(79))
  console.log('  BEFORE vs AFTER')
  console.log('═'.repeat(79) + '\n')

  const avgParallel = Math.round((run1.parallel + run2.parallel) / 2)
  const originalParallel = 171776 // From first measurement
  const improvement = Math.round((1 - avgParallel / originalParallel) * 100)

  console.log(`   Original (no optimization):  ${originalParallel}ms`)
  console.log(`   Optimized (avg of 2 runs):   ${avgParallel}ms`)
  console.log(`   Improvement:                 ${improvement}% faster 🚀`)
  console.log(`   Speedup:                     ${(originalParallel / avgParallel).toFixed(1)}x`)

  console.log('\n' + '═'.repeat(79))
  console.log('  INDIVIDUAL QUERY IMPROVEMENTS')
  console.log('═'.repeat(79) + '\n')

  const original = [63789, 20211, 187661, 105366, 41284] // From first measurement
  const optimized = [
    Math.round((run1.individual[0] + run2.individual[0]) / 2),
    Math.round((run1.individual[1] + run2.individual[1]) / 2),
    Math.round((run1.individual[2] + run2.individual[2]) / 2),
    Math.round((run1.individual[3] + run2.individual[3]) / 2),
    Math.round((run1.individual[4] + run2.individual[4]) / 2)
  ]

  const labels = ['trendingMovies', 'trendingSeries', 'latest', 'topRated', 'series']
  
  labels.forEach((label, i) => {
    const imp = Math.round((1 - optimized[i] / original[i]) * 100)
    const speedup = (original[i] / optimized[i]).toFixed(1)
    console.log(`${(i + 1)}. ${label.padEnd(16)} ${original[i].toString().padStart(6)}ms → ${optimized[i].toString().padStart(6)}ms  (${imp}% faster, ${speedup}x speedup)`)
  })

  console.log('\n' + '━'.repeat(79) + '\n')

  turso.close()
}

run().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
