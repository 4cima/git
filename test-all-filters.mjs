import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('='.repeat(70))
console.log('TEST ALL FILTERS - ISOLATE THE BROKEN ONES')
console.log('='.repeat(70))

const limit = 20
const offset = 0

// Test 1: Genre filter (LIKE on genres_json)
console.log('\n1. GENRE FILTER (genres_json LIKE):')
console.log('-'.repeat(70))
let start = Date.now()
try {
  const result = await turso.execute({
    sql: `SELECT id, title_ar FROM movies WHERE genres_json LIKE ? ORDER BY popularity DESC LIMIT ?`,
    args: [`%"name_ar":"أكشن"%`, limit]
  })
  console.log(`✅ SUCCESS in ${Date.now() - start}ms - ${result.rows.length} rows`)
} catch (error) {
  console.log(`❌ FAILED after ${Date.now() - start}ms: ${error.message}`)
}

// Test 2: Year filter
console.log('\n2. YEAR FILTER (release_year = 2024):')
console.log('-'.repeat(70))
start = Date.now()
try {
  const result = await turso.execute({
    sql: `SELECT id, title_ar FROM movies WHERE release_year = ? ORDER BY popularity DESC LIMIT ?`,
    args: [2024, limit]
  })
  console.log(`✅ SUCCESS in ${Date.now() - start}ms - ${result.rows.length} rows`)
} catch (error) {
  console.log(`❌ FAILED after ${Date.now() - start}ms: ${error.message}`)
}

// Test 3: Country filter (LIKE on countries_json)
console.log('\n3. COUNTRY FILTER (countries_json LIKE):')
console.log('-'.repeat(70))
start = Date.now()
try {
  const result = await turso.execute({
    sql: `SELECT id, title_ar FROM movies WHERE countries_json LIKE ? ORDER BY popularity DESC LIMIT ?`,
    args: [`%US%`, limit]
  })
  console.log(`✅ SUCCESS in ${Date.now() - start}ms - ${result.rows.length} rows`)
} catch (error) {
  console.log(`❌ FAILED after ${Date.now() - start}ms: ${error.message}`)
}

// Test 4: Rating filter
console.log('\n4. RATING FILTER (vote_average >= 8):')
console.log('-'.repeat(70))
start = Date.now()
try {
  const result = await turso.execute({
    sql: `SELECT id, title_ar FROM movies WHERE vote_average >= ? ORDER BY popularity DESC LIMIT ?`,
    args: [8.0, limit]
  })
  console.log(`✅ SUCCESS in ${Date.now() - start}ms - ${result.rows.length} rows`)
} catch (error) {
  console.log(`❌ FAILED after ${Date.now() - start}ms: ${error.message}`)
}

// Test 5: Combined genre + year
console.log('\n5. COMBINED (genre + year):')
console.log('-'.repeat(70))
start = Date.now()
try {
  const result = await turso.execute({
    sql: `SELECT id, title_ar FROM movies WHERE genres_json LIKE ? AND release_year = ? ORDER BY popularity DESC LIMIT ?`,
    args: [`%"name_ar":"أكشن"%`, 2024, limit]
  })
  console.log(`✅ SUCCESS in ${Date.now() - start}ms - ${result.rows.length} rows`)
} catch (error) {
  console.log(`❌ FAILED after ${Date.now() - start}ms: ${error.message}`)
}

// Test 6: Series with genre filter
console.log('\n6. SERIES GENRE FILTER (tv_series genres_json LIKE):')
console.log('-'.repeat(70))
start = Date.now()
try {
  const result = await turso.execute({
    sql: `SELECT id, name_ar FROM tv_series WHERE genres_json LIKE ? ORDER BY popularity DESC LIMIT ?`,
    args: [`%"name_ar":"دراما"%`, limit]
  })
  console.log(`✅ SUCCESS in ${Date.now() - start}ms - ${result.rows.length} rows`)
} catch (error) {
  console.log(`❌ FAILED after ${Date.now() - start}ms: ${error.message}`)
}

console.log('\n' + '='.repeat(70))
