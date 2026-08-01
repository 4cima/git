const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function testBetweenOptimization() {
  console.log('🔬 Testing BETWEEN vs >= AND <= Performance\n')
  console.log('='.repeat(70))
  
  const ratings = [
    { label: '⭐ 10 مذهل', min: 9.1, max: 10.0 },
    { label: '⭐ 9 ممتاز', min: 8.1, max: 9.0 },
    { label: '⭐ 8 جيد جداً', min: 7.1, max: 8.0 },
    { label: '⭐ 7 جيد', min: 6.1, max: 7.0 },
    { label: '⭐ 6 مقبول', min: 5.1, max: 6.0 },
    { label: '⭐ 5 متوسط', min: 4.1, max: 5.0 },
    { label: '⭐ 4 ضعيف', min: 3.1, max: 4.0 },
  ]
  
  for (const rating of ratings) {
    console.log(`\n${rating.label} (${rating.min}-${rating.max})`)
    console.log('-'.repeat(70))
    
    // Test 1: >= AND <= (old way)
    const test1Start = Date.now()
    await turso.execute({
      sql: `
        SELECT id, name_ar, vote_average, popularity
        FROM tv_series
        WHERE vote_average >= ? AND vote_average <= ?
        ORDER BY popularity DESC
        LIMIT 60
      `,
      args: [rating.min, rating.max]
    })
    const test1Duration = Date.now() - test1Start
    
    // Test 2: BETWEEN (new way)
    const test2Start = Date.now()
    await turso.execute({
      sql: `
        SELECT id, name_ar, vote_average, popularity
        FROM tv_series
        WHERE vote_average BETWEEN ? AND ?
        ORDER BY popularity DESC
        LIMIT 60
      `,
      args: [rating.min, rating.max]
    })
    const test2Duration = Date.now() - test2Start
    
    const improvement = test1Duration - test2Duration
    const symbol1 = test1Duration > 1000 ? '❌' : test1Duration > 500 ? '⚠️' : '✅'
    const symbol2 = test2Duration > 1000 ? '❌' : test2Duration > 500 ? '⚠️' : '✅'
    
    console.log(`${symbol1} >= AND <=: ${test1Duration}ms`)
    console.log(`${symbol2} BETWEEN:    ${test2Duration}ms`)
    
    if (improvement > 0) {
      console.log(`📈 Improvement: ${improvement}ms faster (${Math.round(improvement/test1Duration*100)}%)`)
    } else if (improvement < 0) {
      console.log(`📉 Slower by: ${Math.abs(improvement)}ms`)
    } else {
      console.log(`➡️  Same performance`)
    }
  }
  
  // Check query plans
  console.log('\n' + '='.repeat(70))
  console.log('📊 Comparing Query Plans')
  console.log('='.repeat(70))
  
  console.log('\nQuery Plan for >= AND <=:')
  const plan1 = await turso.execute({
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id FROM tv_series
      WHERE vote_average >= ? AND vote_average <= ?
      ORDER BY popularity DESC
      LIMIT 60
    `,
    args: [5.1, 6.0]
  })
  plan1.rows.forEach(row => console.log(`  ${row.detail || row[3]}`))
  
  console.log('\nQuery Plan for BETWEEN:')
  const plan2 = await turso.execute({
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id FROM tv_series
      WHERE vote_average BETWEEN ? AND ?
      ORDER BY popularity DESC
      LIMIT 60
    `,
    args: [5.1, 6.0]
  })
  plan2.rows.forEach(row => console.log(`  ${row.detail || row[3]}`))
  
  console.log('\n' + '='.repeat(70))
}

testBetweenOptimization().catch(console.error)
