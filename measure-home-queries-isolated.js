/**
 * Measure actual query performance in isolation
 * No HTTP overhead, no caching, no dev/prod mode differences
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function measureQueries() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  قياس سرعة الـ Queries الفعلية')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Query 1: Trending Movies
  const t1 = Date.now()
  const trendingMoviesRes = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies 
          WHERE poster_path IS NOT NULL 
            AND backdrop_path IS NOT NULL 
            AND vote_average > 0
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  const d1 = Date.now() - t1
  console.log(`1️⃣  trendingMovies: ${d1}ms (${trendingMoviesRes.rows.length} rows)`)

  // Query 2: Trending Series
  const t2 = Date.now()
  const trendingSeriesRes = await turso.execute({
    sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
          FROM tv_series 
          WHERE poster_path IS NOT NULL 
            AND backdrop_path IS NOT NULL 
            AND vote_average > 0
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  const d2 = Date.now() - t2
  console.log(`2️⃣  trendingSeries: ${d2}ms (${trendingSeriesRes.rows.length} rows)`)

  // Query 3: Latest Movies
  const t3 = Date.now()
  const latestRes = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies 
          WHERE poster_path IS NOT NULL
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY release_year DESC, popularity DESC
          LIMIT 50`,
    args: []
  })
  const d3 = Date.now() - t3
  console.log(`3️⃣  latest: ${d3}ms (${latestRes.rows.length} rows)`)

  // Query 4: Top Rated Movies
  const t4 = Date.now()
  const topRatedRes = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies 
          WHERE poster_path IS NOT NULL 
            AND vote_average >= 7.5
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY vote_average DESC
          LIMIT 50`,
    args: []
  })
  const d4 = Date.now() - t4
  console.log(`4️⃣  topRated: ${d4}ms (${topRatedRes.rows.length} rows)`)

  // Query 5: Series
  const t5 = Date.now()
  const seriesRes = await turso.execute({
    sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
          FROM tv_series 
          WHERE poster_path IS NOT NULL
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY popularity DESC
          LIMIT 50`,
    args: []
  })
  const d5 = Date.now() - t5
  console.log(`5️⃣  series: ${d5}ms (${seriesRes.rows.length} rows)`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`⏱️  الإجمالي: ${d1 + d2 + d3 + d4 + d5}ms`)
  console.log(`📊  المتوسط: ${Math.round((d1 + d2 + d3 + d4 + d5) / 5)}ms لكل query`)
  console.log(`🐌  الأبطأ: Query ${[d1, d2, d3, d4, d5].indexOf(Math.max(d1, d2, d3, d4, d5)) + 1} (${Math.max(d1, d2, d3, d4, d5)}ms)`)
  console.log(`⚡  الأسرع: Query ${[d1, d2, d3, d4, d5].indexOf(Math.min(d1, d2, d3, d4, d5)) + 1} (${Math.min(d1, d2, d3, d4, d5)}ms)`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Now run all in parallel (like the actual route does)
  console.log('🔄 قياس التشغيل بالتوازي (Promise.all)...\n')
  const tParallel = Date.now()
  await Promise.all([
    turso.execute({
      sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
            FROM movies 
            WHERE poster_path IS NOT NULL 
              AND backdrop_path IS NOT NULL 
              AND vote_average > 0
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            ORDER BY popularity DESC 
            LIMIT 50`,
      args: []
    }),
    turso.execute({
      sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
            FROM tv_series 
            WHERE poster_path IS NOT NULL 
              AND backdrop_path IS NOT NULL 
              AND vote_average > 0
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            ORDER BY popularity DESC 
            LIMIT 50`,
      args: []
    }),
    turso.execute({
      sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
            FROM movies 
            WHERE poster_path IS NOT NULL
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            ORDER BY release_year DESC, popularity DESC
            LIMIT 50`,
      args: []
    }),
    turso.execute({
      sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
            FROM movies 
            WHERE poster_path IS NOT NULL 
              AND vote_average >= 7.5
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            ORDER BY vote_average DESC
            LIMIT 50`,
      args: []
    }),
    turso.execute({
      sql: `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
            FROM tv_series 
            WHERE poster_path IS NOT NULL
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            ORDER BY popularity DESC
            LIMIT 50`,
      args: []
    })
  ])
  const dParallel = Date.now() - tParallel
  console.log(`⚡ Promise.all: ${dParallel}ms`)
  console.log(`📈 الفرق: تسلسلي ${d1 + d2 + d3 + d4 + d5}ms vs متوازي ${dParallel}ms`)

  turso.close()
}

measureQueries().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
