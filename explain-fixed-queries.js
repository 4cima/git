/**
 * EXPLAIN QUERY PLAN after removing OR filter_status IS NULL
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function explainQueries() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  EXPLAIN بعد التعديل')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Query 4: Top Rated (الأبطأ - 279s)
  console.log('🐌 Query 4: Top Rated (279.7s)')
  console.log('─────────────────────────────────────')
  const explain4 = await turso.execute({
    sql: `EXPLAIN QUERY PLAN
          SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies 
          WHERE poster_path IS NOT NULL 
            AND vote_average >= 7.5
            AND filter_status IN ('clean', 'reviewed_approved')
          ORDER BY vote_average DESC
          LIMIT 50`,
    args: []
  })
  console.log(JSON.stringify(explain4.rows, null, 2))
  console.log('\n')

  // Query 1: Trending Movies (139s)
  console.log('🐢 Query 1: Trending Movies (139.5s)')
  console.log('─────────────────────────────────────')
  const explain1 = await turso.execute({
    sql: `EXPLAIN QUERY PLAN
          SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
          FROM movies 
          WHERE poster_path IS NOT NULL 
            AND backdrop_path IS NOT NULL 
            AND vote_average > 0
            AND filter_status IN ('clean', 'reviewed_approved')
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  console.log(JSON.stringify(explain1.rows, null, 2))
  console.log('\n')

  turso.close()
}

explainQueries().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
