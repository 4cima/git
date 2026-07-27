// ─────────────────────────────────────────────────────────────
// Runtime Type Verification for Turso Query Results
// ─────────────────────────────────────────────────────────────
import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function verifyTypes() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 VERIFYING ACTUAL RUNTIME TYPES FROM TURSO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // ─────────────────────────────────────────────────────────────
  // Test 1: COUNT(*) queries (used in dashboard stats)
  // ─────────────────────────────────────────────────────────────
  console.log('📊 Test 1: COUNT(*) queries (dashboard stats)')
  console.log('─────────────────────────────────────────────')
  
  const countResult = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const countValue = countResult.rows[0].count
  
  console.log('Query: SELECT COUNT(*) as count FROM movies')
  console.log('typeof:', typeof countValue)
  console.log('constructor:', countValue?.constructor?.name)
  console.log('value:', countValue)
  console.log('Is ArrayBuffer?', countValue instanceof ArrayBuffer)
  console.log('String() result:', String(countValue))
  console.log('')

  // ─────────────────────────────────────────────────────────────
  // Test 2: SUM() aggregate (used for total seasons)
  // ─────────────────────────────────────────────────────────────
  console.log('📊 Test 2: SUM() aggregate query')
  console.log('─────────────────────────────────────────────')
  
  const sumResult = await turso.execute('SELECT SUM(number_of_seasons) as count FROM tv_series WHERE number_of_seasons > 0')
  const sumValue = sumResult.rows[0].count
  
  console.log('Query: SELECT SUM(number_of_seasons) as count FROM tv_series')
  console.log('typeof:', typeof sumValue)
  console.log('constructor:', sumValue?.constructor?.name)
  console.log('value:', sumValue)
  console.log('Is ArrayBuffer?', sumValue instanceof ArrayBuffer)
  console.log('String() result:', String(sumValue))
  console.log('')

  // ─────────────────────────────────────────────────────────────
  // Test 3: Regular field values (strings, numbers)
  // ─────────────────────────────────────────────────────────────
  console.log('📊 Test 3: Regular field values')
  console.log('─────────────────────────────────────────────')
  
  const movieResult = await turso.execute('SELECT tmdb_id, title_ar, title_en, vote_average FROM movies LIMIT 1')
  if (movieResult.rows.length > 0) {
    const row = movieResult.rows[0]
    console.log('Row keys:', Object.keys(row))
    
    for (const [key, value] of Object.entries(row)) {
      console.log(`\n  ${key}:`)
      console.log(`    typeof: ${typeof value}`)
      console.log(`    constructor: ${value?.constructor?.name}`)
      console.log(`    value: ${value}`)
      console.log(`    Is ArrayBuffer? ${value instanceof ArrayBuffer}`)
    }
  }
  console.log('')

  // ─────────────────────────────────────────────────────────────
  // Test 4: BLOB column (if exists) - potential ArrayBuffer source
  // ─────────────────────────────────────────────────────────────
  console.log('📊 Test 4: Checking for BLOB columns in schema')
  console.log('─────────────────────────────────────────────')
  
  const schemaResult = await turso.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('movies', 'tv_series')")
  for (const row of schemaResult.rows) {
    console.log('Schema SQL:', row.sql)
    console.log('Contains BLOB?', String(row.sql).includes('BLOB'))
    console.log('')
  }

  // ─────────────────────────────────────────────────────────────
  // Test 5: fields object values from admin API context
  // ─────────────────────────────────────────────────────────────
  console.log('📊 Test 5: Simulating admin PATCH scenario')
  console.log('─────────────────────────────────────────────')
  
  const testFields = {
    title_ar: 'اختبار',
    vote_average: 8.5,
    release_year: 2024,
    runtime: null,
    trailer_key: undefined, // What happens with undefined?
  }
  
  const safe = Object.entries(testFields)
  console.log('Safe entries after Object.entries():')
  for (const [k, v] of safe) {
    console.log(`  ${k}:`)
    console.log(`    typeof: ${typeof v}`)
    console.log(`    value: ${v}`)
    console.log(`    Is undefined? ${v === undefined}`)
    console.log(`    Would survive whitelist? yes (simulated)`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ VERIFICATION COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

verifyTypes().catch(console.error)
