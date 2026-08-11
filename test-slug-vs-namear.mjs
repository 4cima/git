import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('='.repeat(70))
console.log('SLUG vs NAME_AR COMPARISON')
console.log('='.repeat(70))

const limit = 5

// Test 1: Search by name_ar (current broken implementation)
console.log('\n1. SEARCH BY name_ar (current code - WRONG):')
console.log('-'.repeat(70))
let start = Date.now()
const result1 = await turso.execute({
  sql: `SELECT id, title_ar, genres_json FROM movies WHERE genres_json LIKE ? ORDER BY popularity DESC LIMIT ?`,
  args: [`%"name_ar":"action"%`, limit]
})
console.log(`Time: ${Date.now() - start}ms`)
console.log(`Results: ${result1.rows.length} rows`)
if (result1.rows.length > 0) {
  console.log(`First: ${result1.rows[0].title_ar}`)
  console.log(`Genres: ${result1.rows[0].genres_json}`)
}

// Test 2: Search by slug (correct implementation)
console.log('\n2. SEARCH BY slug (correct):')
console.log('-'.repeat(70))
start = Date.now()
const result2 = await turso.execute({
  sql: `SELECT id, title_ar, genres_json FROM movies WHERE genres_json LIKE ? ORDER BY popularity DESC LIMIT ?`,
  args: [`%"slug":"action"%`, limit]
})
console.log(`Time: ${Date.now() - start}ms`)
console.log(`Results: ${result2.rows.length} rows`)
if (result2.rows.length > 0) {
  console.log(`First: ${result2.rows[0].title_ar}`)
  console.log(`Genres: ${result2.rows[0].genres_json}`)
}

// Test 3: Search by Arabic name_ar (what it SHOULD be if using name_ar)
console.log('\n3. SEARCH BY name_ar with ARABIC (أكشن):')
console.log('-'.repeat(70))
start = Date.now()
const result3 = await turso.execute({
  sql: `SELECT id, title_ar, genres_json FROM movies WHERE genres_json LIKE ? ORDER BY popularity DESC LIMIT ?`,
  args: [`%"name_ar":"أكشن"%`, limit]
})
console.log(`Time: ${Date.now() - start}ms`)
console.log(`Results: ${result3.rows.length} rows`)
if (result3.rows.length > 0) {
  console.log(`First: ${result3.rows[0].title_ar}`)
}

console.log('\n' + '='.repeat(70))
console.log('CONCLUSION:')
console.log('The API receives genre=action (slug) but searches for name_ar="action"')
console.log('This will return 0 results, causing a full table scan!')
console.log('Fix: Use "slug" field instead of "name_ar" in the LIKE query')
console.log('='.repeat(70))
