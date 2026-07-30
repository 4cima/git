const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function main() {
  console.log('\n=== Movies Indexes ===\n')
  const moviesIndexes = await turso.execute({
    sql: "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='movies'",
    args: []
  })
  
  if (moviesIndexes.rows.length === 0) {
    console.log('❌ No indexes on movies table')
  } else {
    moviesIndexes.rows.forEach(row => {
      console.log(`✅ ${row.name}`)
      console.log(`   ${row.sql}\n`)
    })
  }
  
  console.log('\n=== TV Series Indexes ===\n')
  const seriesIndexes = await turso.execute({
    sql: "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='tv_series'",
    args: []
  })
  
  if (seriesIndexes.rows.length === 0) {
    console.log('❌ No indexes on tv_series table')
  } else {
    seriesIndexes.rows.forEach(row => {
      console.log(`✅ ${row.name}`)
      console.log(`   ${row.sql}\n`)
    })
  }
}

main().catch(console.error)
