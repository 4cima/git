import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('='.repeat(70))
console.log('GENRE FILTER QUERY PLAN DIAGNOSIS')
console.log('='.repeat(70))

// The exact query used when genre=action is applied
const genreValue = 'أكشن' // Arabic for "action"
const limit = 20
const offset = 0

console.log('\n1. EXPLAIN QUERY PLAN for genre filter (LIKE on genres_json):')
console.log('-'.repeat(70))

const explainResult = await turso.execute({
  sql: `
    EXPLAIN QUERY PLAN
    SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
           movies.vote_average, movies.release_year,
           movies.genres_json, movies.overview_ar, movies.original_language
    FROM movies
    WHERE genres_json LIKE ?
    ORDER BY popularity DESC
    LIMIT ? OFFSET ?
  `,
  args: [`%"name_ar":"${genreValue}"%`, limit + 1, offset]
})

explainResult.rows.forEach(row => {
  console.log(row)
})

console.log('\n2. Testing actual execution time:')
console.log('-'.repeat(70))

const startTime = Date.now()
try {
  const result = await turso.execute({
    sql: `
      SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
             movies.vote_average, movies.release_year,
             movies.genres_json, movies.overview_ar, movies.original_language
      FROM movies
      WHERE genres_json LIKE ?
      ORDER BY popularity DESC
      LIMIT ? OFFSET ?
    `,
    args: [`%"name_ar":"${genreValue}"%`, limit + 1, offset]
  })
  const endTime = Date.now()
  console.log(`✅ Query succeeded in ${endTime - startTime}ms`)
  console.log(`   Rows returned: ${result.rows.length}`)
  console.log(`   First movie: ${result.rows[0]?.title_ar}`)
} catch (error) {
  const endTime = Date.now()
  console.log(`❌ Query failed after ${endTime - startTime}ms`)
  console.log(`   Error: ${error.message}`)
}

console.log('\n3. Checking genres_json structure (sample):')
console.log('-'.repeat(70))
const sample = await turso.execute(`SELECT id, title_ar, genres_json FROM movies LIMIT 1`)
console.log(sample.rows[0])

console.log('\n4. Count movies with action genre:')
console.log('-'.repeat(70))
const countStart = Date.now()
const countResult = await turso.execute({
  sql: `SELECT COUNT(*) as count FROM movies WHERE genres_json LIKE ?`,
  args: [`%"name_ar":"${genreValue}"%`]
})
const countEnd = Date.now()
console.log(`   Count: ${countResult.rows[0].count} movies`)
console.log(`   Time: ${countEnd - countStart}ms`)

console.log('\n' + '='.repeat(70))
