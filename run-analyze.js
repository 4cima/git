/**
 * Run ANALYZE to update SQLite statistics
 * This helps the query planner choose better indexes
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function runAnalyze() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  تشغيل ANALYZE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const start = Date.now()
  await turso.execute('ANALYZE')
  const duration = Date.now() - start

  console.log(`✅ ANALYZE complete in ${duration}ms`)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  turso.close()
}

runAnalyze().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
