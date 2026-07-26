require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function main() {
  console.log('🔍 فحص schema لـ Turso (movies):\n')
  
  const result = await turso.execute('PRAGMA table_info(movies)')
  
  console.log('الأعمدة الموجودة:')
  result.rows.forEach(col => {
    console.log(`  [${col.cid}] ${col.name} (${col.type})`)
  })
  
  const hasIsFiltered = result.rows.some(col => col.name === 'is_filtered')
  const hasFilterReason = result.rows.some(col => col.name === 'filter_reason')
  const hasFilterStatus = result.rows.some(col => col.name === 'filter_status')
  
  console.log(`\nهل is_filtered موجود؟ ${hasIsFiltered ? '✅' : '❌'}`)
  console.log(`هل filter_reason موجود؟ ${hasFilterReason ? '✅' : '❌'}`)
  console.log(`هل filter_status موجود؟ ${hasFilterStatus ? '✅' : '❌'}`)
}

main().catch(err => {
  console.error('خطأ:', err)
  process.exit(1)
})
