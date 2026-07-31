/**
 * Run EXPLAIN QUERY PLAN on the 3 slowest queries
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function explainQueries() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  EXPLAIN QUERY PLAN للـ Queries الأبطأ')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Query 3: Latest (الأبطأ - 187s)
  console.log('🐌 Query 3: Latest (187.6s)')
  console.log('─────────────────────────────────────')
  const explain3 = await turso.execute({
    sql: `EXPLAIN QUERY PLAN
          SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies 
          WHERE poster_path IS NOT NULL
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY release_year DESC, popularity DESC
          LIMIT 50`,
    args: []
  })
  console.log(explain3.rows)
  console.log('\n')

  // Query 4: Top Rated (105s)
  console.log('🐢 Query 4: Top Rated (105.4s)')
  console.log('─────────────────────────────────────')
  const explain4 = await turso.execute({
    sql: `EXPLAIN QUERY PLAN
          SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies 
          WHERE poster_path IS NOT NULL 
            AND vote_average >= 7.5
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY vote_average DESC
          LIMIT 50`,
    args: []
  })
  console.log(explain4.rows)
  console.log('\n')

  // Query 1: Trending Movies (64s)
  console.log('🦥 Query 1: Trending Movies (63.8s)')
  console.log('─────────────────────────────────────')
  const explain1 = await turso.execute({
    sql: `EXPLAIN QUERY PLAN
          SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies 
          WHERE poster_path IS NOT NULL 
            AND backdrop_path IS NOT NULL 
            AND vote_average > 0
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  console.log(explain1.rows)
  console.log('\n')

  // Query 2: Trending Series (20s - الأسرع نسبيًا)
  console.log('🐇 Query 2: Trending Series (20.2s)')
  console.log('─────────────────────────────────────')
  const explain2 = await turso.execute({
    sql: `EXPLAIN QUERY PLAN
          SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
          FROM tv_series 
          WHERE poster_path IS NOT NULL 
            AND backdrop_path IS NOT NULL 
            AND vote_average > 0
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  console.log(explain2.rows)
  console.log('\n')

  // Query 5: Series (41s)
  console.log('🐌 Query 5: Series (41.3s)')
  console.log('─────────────────────────────────────')
  const explain5 = await turso.execute({
    sql: `EXPLAIN QUERY PLAN
          SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
          FROM tv_series 
          WHERE poster_path IS NOT NULL
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY popularity DESC
          LIMIT 50`,
    args: []
  })
  console.log(explain5.rows)
  console.log('\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⚠️  ابحث عن "SCAN" - ده معناه full table scan')
  console.log('✅  "SEARCH" - ده معناه index مستخدم')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  turso.close()
}

explainQueries().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
