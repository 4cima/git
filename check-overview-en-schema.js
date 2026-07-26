require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('🔍 فحص وجود overview_en في Turso schema')
  console.log('═══════════════════════════════════════════════════\n')

  // Movies schema
  console.log('─────────────────────────────────────────────────')
  console.log('📋 PRAGMA table_info(movies):')
  console.log('─────────────────────────────────────────────────\n')
  const moviesSchema = await turso.execute('PRAGMA table_info(movies)')
  moviesSchema.rows.forEach(col => {
    console.log(`  [${col.cid}] ${col.name} (${col.type})`)
  })
  
  const hasOverviewEn = moviesSchema.rows.some(col => col.name === 'overview_en')
  console.log(`\n❓ هل overview_en موجود في movies؟ ${hasOverviewEn ? '✅ نعم' : '❌ لا'}\n`)

  // TV Series schema
  console.log('─────────────────────────────────────────────────')
  console.log('📋 PRAGMA table_info(tv_series):')
  console.log('─────────────────────────────────────────────────\n')
  const seriesSchema = await turso.execute('PRAGMA table_info(tv_series)')
  seriesSchema.rows.forEach(col => {
    console.log(`  [${col.cid}] ${col.name} (${col.type})`)
  })
  
  const hasOverviewEnSeries = seriesSchema.rows.some(col => col.name === 'overview_en')
  console.log(`\n❓ هل overview_en موجود في tv_series؟ ${hasOverviewEnSeries ? '✅ نعم' : '❌ لا'}\n`)

  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
