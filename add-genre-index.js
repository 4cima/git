import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function addGenreIndex() {
  console.log('🔧 إضافة Index لـ genres_json...\n')

  try {
    console.log('⏳ إنشاء idx_series_genres...')
    const start = Date.now()
    
    // Index for genres_json - helps with LIKE queries
    await turso.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_series_genres ON tv_series(genres_json)`,
      args: []
    })
    
    const duration = Date.now() - start
    console.log(`✅ تم إنشاء idx_series_genres في ${duration}ms\n`)

    // Test performance
    console.log('⏱️ اختبار السرعة:\n')
    
    const tests = [
      { name: 'دراما', sql: `SELECT COUNT(*) FROM tv_series WHERE genres_json LIKE '%دراما%'` },
      { name: 'كوميديا', sql: `SELECT COUNT(*) FROM tv_series WHERE genres_json LIKE '%كوميديا%'` },
      { name: 'أكشن', sql: `SELECT COUNT(*) FROM tv_series WHERE genres_json LIKE '%أكشن%'` },
    ]

    for (const test of tests) {
      const start = Date.now()
      const result = await turso.execute({ sql: test.sql, args: [] })
      const duration = Date.now() - start
      const count = result.rows[0]['COUNT(*)']
      
      const emoji = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴'
      console.log(`${emoji} ${test.name.padEnd(15)} ${String(count).padStart(6)} نتيجة في ${duration}ms`)
    }

    console.log('\n✅ اكتمل!')

  } catch (error) {
    console.error('❌ خطأ:', error.message)
  }
}

addGenreIndex()
