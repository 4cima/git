const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function testSortFilters() {
  console.log('🧪 Testing all sort filters with performance metrics...\n')

  const tests = [
    { name: '🔥 الأكثر شهرة', column: 'popularity', order: 'DESC' },
    { name: '⭐ الأعلى تقييماً', column: 'vote_average', order: 'DESC' },
    { name: '📊 الأكثر تقييماً', column: 'vote_count', order: 'DESC' },
    { name: '📅 الأحدث', column: 'first_air_year', order: 'DESC' },
    { name: '🕰️ الأقدم', column: 'first_air_year', order: 'ASC' },
    { name: '🆕 آخر إضافة', column: 'created_at', order: 'DESC' },
    { name: '🔤 الاسم (أ-ي)', column: 'name_ar', order: 'ASC' },
    { name: '🔤 الاسم (ي-أ)', column: 'name_ar', order: 'DESC' },
  ]

  for (const test of tests) {
    const start = Date.now()
    
    const result = await turso.execute({
      sql: `
        SELECT 
          id, slug, name_ar, ${test.column}
        FROM tv_series
        ORDER BY ${test.column} ${test.order}
        LIMIT 5
      `,
      args: []
    })

    const duration = Date.now() - start
    
    console.log(`${test.name}`)
    console.log(`  ⏱️  Performance: ${duration}ms`)
    console.log(`  📋 Top 5 results:`)
    
    result.rows.forEach((row, idx) => {
      const value = row[test.column]
      let displayValue = value
      
      if (test.column === 'created_at') {
        displayValue = value ? value.substring(0, 19) : 'N/A'
      } else if (test.column === 'vote_average' || test.column === 'popularity') {
        displayValue = typeof value === 'number' ? value.toFixed(2) : value
      }
      
      console.log(`     ${idx + 1}. ${row.name_ar} (${displayValue})`)
    })
    
    console.log()
  }

  console.log('✅ All sort filters tested successfully!')
}

testSortFilters().catch(console.error)
