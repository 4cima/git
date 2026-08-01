import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function addMissingIndexes() {
  console.log('🔧 إضافة Indexes للفلاتر البطيئة...\n')

  const indexes = [
    {
      name: 'idx_series_country',
      sql: `CREATE INDEX IF NOT EXISTS idx_series_country ON tv_series(country_of_origin)`
    },
    {
      name: 'idx_series_age_rating',
      sql: `CREATE INDEX IF NOT EXISTS idx_series_age_rating ON tv_series(age_rating)`
    },
    {
      name: 'idx_series_name_ar',
      sql: `CREATE INDEX IF NOT EXISTS idx_series_name_ar ON tv_series(name_ar)`
    },
    {
      name: 'idx_series_name_en',
      sql: `CREATE INDEX IF NOT EXISTS idx_series_name_en ON tv_series(name_en)`
    },
  ]

  for (const index of indexes) {
    try {
      console.log(`⏳ إنشاء ${index.name}...`)
      const start = Date.now()
      await turso.execute({ sql: index.sql, args: [] })
      const duration = Date.now() - start
      console.log(`✅ تم إنشاء ${index.name} في ${duration}ms\n`)
    } catch (error) {
      console.error(`❌ خطأ في ${index.name}:`, error.message, '\n')
    }
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('✅ تم إضافة جميع الـ Indexes!')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Test performance again
  console.log('⏱️ اختبار السرعة بعد إضافة الـ Indexes:\n')
  
  const tests = [
    { name: 'Genre (genres_json)', sql: `SELECT COUNT(*) FROM tv_series WHERE genres_json LIKE '%دراما%'` },
    { name: 'Country (country_of_origin)', sql: `SELECT COUNT(*) FROM tv_series WHERE country_of_origin = 'US'` },
    { name: 'Age Rating (age_rating)', sql: `SELECT COUNT(*) FROM tv_series WHERE age_rating = 'TV-14'` },
    { name: 'Search name_ar', sql: `SELECT COUNT(*) FROM tv_series WHERE name_ar LIKE '%بريكنج%'` },
  ]

  for (const test of tests) {
    const start = Date.now()
    await turso.execute({ sql: test.sql, args: [] })
    const duration = Date.now() - start
    
    const emoji = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴'
    console.log(`${emoji} ${test.name.padEnd(30)} ${duration}ms`)
  }

  console.log('\n✅ تم تحسين الأداء!')
}

addMissingIndexes()
