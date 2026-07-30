/**
 * Stage 1: Add Missing Columns to Turso
 * Adds: age_rating, imdb_id, country_of_origin
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function addColumns() {
  console.log('🚀 Adding missing columns to Turso...\n')
  
  const statements = [
    { sql: 'ALTER TABLE movies ADD COLUMN age_rating TEXT DEFAULT NULL', desc: 'movies.age_rating' },
    { sql: 'ALTER TABLE movies ADD COLUMN imdb_id TEXT DEFAULT NULL', desc: 'movies.imdb_id' },
    { sql: 'ALTER TABLE movies ADD COLUMN country_of_origin TEXT DEFAULT NULL', desc: 'movies.country_of_origin' },
    { sql: 'ALTER TABLE tv_series ADD COLUMN age_rating TEXT DEFAULT NULL', desc: 'tv_series.age_rating' },
    { sql: 'ALTER TABLE tv_series ADD COLUMN imdb_id TEXT DEFAULT NULL', desc: 'tv_series.imdb_id' },
    { sql: 'ALTER TABLE tv_series ADD COLUMN country_of_origin TEXT DEFAULT NULL', desc: 'tv_series.country_of_origin' }
  ]
  
  for (let i = 0; i < statements.length; i++) {
    try {
      console.log(`${i+1}/${statements.length} Executing: ${statements[i].desc}`)
      await turso.execute(statements[i].sql)
      console.log('   ✅ Success\n')
    } catch (err) {
      if (err.message.includes('duplicate column')) {
        console.log('   ⚠️  Column already exists (skipping)\n')
      } else {
        console.error(`   ❌ Failed: ${err.message}\n`)
        throw err
      }
    }
  }
  
  console.log('✅ Finished executing all ALTER TABLE statements\n')
  console.log('🔍 Verifying new schema...\n')
  
  // Verify movies table
  console.log('📋 PRAGMA table_info(movies):')
  const moviesInfo = await turso.execute('PRAGMA table_info(movies)')
  moviesInfo.rows.forEach(row => {
    const name = row.name || row[1]
    const type = row.type || row[2]
    const dflt = row.dflt_value || row[4]
    console.log(`   - ${name} (${type}) DEFAULT ${dflt === null ? 'NULL' : dflt}`)
  })
  
  console.log('\n📋 PRAGMA table_info(tv_series):')
  const seriesInfo = await turso.execute('PRAGMA table_info(tv_series)')
  seriesInfo.rows.forEach(row => {
    const name = row.name || row[1]
    const type = row.type || row[2]
    const dflt = row.dflt_value || row[4]
    console.log(`   - ${name} (${type}) DEFAULT ${dflt === null ? 'NULL' : dflt}`)
  })
  
  console.log('\n✅ Schema verification complete!')
}

addColumns().catch(console.error)
