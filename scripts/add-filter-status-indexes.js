const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function main() {
  console.log('\n📊 Adding filter_status indexes...\n')
  
  try {
    await turso.execute({
      sql: 'CREATE INDEX IF NOT EXISTS idx_movies_filter_status ON movies(filter_status)',
      args: []
    })
    console.log('✅ Created idx_movies_filter_status')
  } catch (e) {
    console.log('❌ Movies filter_status:', e.message)
  }
  
  try {
    await turso.execute({
      sql: 'CREATE INDEX IF NOT EXISTS idx_series_filter_status ON tv_series(filter_status)',
      args: []
    })
    console.log('✅ Created idx_series_filter_status')
  } catch (e) {
    console.log('❌ Series filter_status:', e.message)
  }
  
  console.log('\n✅ Indexes created successfully!\n')
}

main().catch(console.error)
