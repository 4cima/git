import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function testAgeRatingFilters() {
  console.log('🧪 اختبار فلاتر الأعمار الجديدة...\n')

  const filters = [
    {
      name: 'أطفال (kids)',
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE age_rating IN ('TV-Y', 'TV-Y7')`,
      ratings: ['TV-Y', 'TV-Y7']
    },
    {
      name: 'عائلي (family)',
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE age_rating IN ('TV-G', 'TV-PG', 'NR')`,
      ratings: ['TV-G', 'TV-PG', 'NR']
    },
    {
      name: 'مراهقين (teens)',
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE age_rating = 'TV-14'`,
      ratings: ['TV-14']
    },
    {
      name: 'بالغين (mature)',
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE age_rating = 'TV-MA'`,
      ratings: ['TV-MA']
    },
  ]

  console.log('═══════════════════════════════════════════════════════════')
  console.log('الفلتر              | العدد  | التصنيفات المشمولة | الوقت')
  console.log('═══════════════════════════════════════════════════════════')

  let totalCount = 0

  for (const filter of filters) {
    const start = Date.now()
    const result = await turso.execute({ sql: filter.sql, args: [] })
    const duration = Date.now() - start
    const count = result.rows[0].count
    totalCount += Number(count)

    const emoji = duration < 50 ? '🟢' : duration < 150 ? '🟡' : '🔴'
    const ratingsStr = filter.ratings.join(', ')
    
    console.log(`${filter.name.padEnd(20)} | ${String(count).padStart(6)} | ${ratingsStr.padEnd(20)} | ${emoji} ${duration}ms`)
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log(`المجموع الكلي: ${totalCount} مسلسل\n`)

  // Check index usage
  console.log('📊 التحقق من استخدام الـ Index:\n')
  
  const explainResult = await turso.execute({
    sql: `EXPLAIN QUERY PLAN SELECT COUNT(*) FROM tv_series WHERE age_rating IN ('TV-G', 'TV-PG', 'NR')`,
    args: []
  })

  console.log('Query Plan for age_rating filter:')
  explainResult.rows.forEach(row => {
    const detail = row.detail || row[3] || 'N/A'
    if (detail.includes('idx_series_age_rating')) {
      console.log('✅ يستخدم Index: idx_series_age_rating')
    } else if (detail.includes('SCAN')) {
      console.log('⚠️ Full table scan (بدون Index)')
    }
    console.log(`   ${detail}`)
  })

  // Test sample results
  console.log('\n📝 أمثلة من كل فلتر:\n')
  
  for (const filter of filters) {
    const sampleSql = filter.sql.replace('COUNT(*) as count', 'name_ar, age_rating').replace('FROM', 'FROM').split('WHERE')[0] + 'WHERE ' + filter.sql.split('WHERE')[1] + ' LIMIT 3'
    const samples = await turso.execute({ sql: sampleSql, args: [] })
    
    console.log(`${filter.name}:`)
    samples.rows.forEach(s => {
      console.log(`  - ${s.name_ar} (${s.age_rating})`)
    })
    console.log('')
  }

  console.log('✅ اختبار الفلاتر اكتمل!')
}

testAgeRatingFilters()
