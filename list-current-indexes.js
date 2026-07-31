/**
 * List all current indexes on movies and tv_series tables
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function listIndexes() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Indexes الموجودة حاليًا')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Movies indexes
  console.log('📽️  Movies Table:')
  console.log('─────────────────────────────────────')
  const moviesIndexes = await turso.execute({
    sql: `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='movies' AND name NOT LIKE 'sqlite_%'`,
    args: []
  })
  moviesIndexes.rows.forEach(row => {
    console.log(`\n${row.name}:`)
    console.log(row.sql || '(auto-created)')
  })

  console.log('\n\n📺 TV Series Table:')
  console.log('─────────────────────────────────────')
  const seriesIndexes = await turso.execute({
    sql: `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='tv_series' AND name NOT LIKE 'sqlite_%'`,
    args: []
  })
  seriesIndexes.rows.forEach(row => {
    console.log(`\n${row.name}:`)
    console.log(row.sql || '(auto-created)')
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  turso.close()
}

listIndexes().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
