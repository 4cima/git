/**
 * Create genre_counts table for precomputed genre statistics
 * This avoids expensive json_each() queries on every request
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function createTable() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  إنشاء جدول genre_counts')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const sql = `
    CREATE TABLE IF NOT EXISTS genre_counts (
      genre_id INTEGER PRIMARY KEY,
      movie_count INTEGER NOT NULL DEFAULT 0,
      series_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `

  console.log('📝 SQL:')
  console.log(sql)
  console.log()

  const start = Date.now()
  await turso.execute(sql)
  const duration = Date.now() - start

  console.log(`✅ Table created in ${duration}ms`)
  console.log()
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  turso.close()
}

createTable().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
