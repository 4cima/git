const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function fixRatingFilterPerformance() {
  console.log('🔧 Fixing Rating Filter Performance Issue\n')
  console.log('='.repeat(70))
  
  // Test BEFORE
  console.log('\n📊 BEFORE: Testing rating filter (5.1-6.0)')
  console.log('-'.repeat(70))
  
  const beforeStart = Date.now()
  await turso.execute({
    sql: `
      SELECT id, name_ar, vote_average, popularity
      FROM tv_series
      WHERE vote_average >= ? AND vote_average <= ?
      ORDER BY popularity DESC
      LIMIT 60
    `,
    args: [5.1, 6.0]
  })
  const beforeDuration = Date.now() - beforeStart
  console.log(`⏱️  Time BEFORE fix: ${beforeDuration}ms`)
  
  // Create the composite index
  console.log('\n🔨 Creating composite index...')
  console.log('-'.repeat(70))
  
  const createStart = Date.now()
  try {
    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_vote_popularity 
      ON tv_series(vote_average, popularity DESC)
    `)
    const createDuration = Date.now() - createStart
    console.log(`✅ Index created successfully in ${createDuration}ms`)
  } catch (error) {
    console.log(`⚠️  Index might already exist: ${error.message}`)
  }
  
  // Test AFTER
  console.log('\n📊 AFTER: Testing rating filter (5.1-6.0)')
  console.log('-'.repeat(70))
  
  const afterStart = Date.now()
  await turso.execute({
    sql: `
      SELECT id, name_ar, vote_average, popularity
      FROM tv_series
      WHERE vote_average >= ? AND vote_average <= ?
      ORDER BY popularity DESC
      LIMIT 60
    `,
    args: [5.1, 6.0]
  })
  const afterDuration = Date.now() - afterStart
  console.log(`⏱️  Time AFTER fix: ${afterDuration}ms`)
  
  // Check query plan after fix
  console.log('\n📊 Query Plan AFTER fix:')
  console.log('-'.repeat(70))
  
  const explainAfter = await turso.execute({
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id, name_ar, vote_average, popularity
      FROM tv_series
      WHERE vote_average >= ? AND vote_average <= ?
      ORDER BY popularity DESC
      LIMIT 60
    `,
    args: [5.1, 6.0]
  })
  
  explainAfter.rows.forEach(row => {
    console.log(`  ${row.detail || row[3]}`)
  })
  
  // Test all rating ranges
  console.log('\n📊 Testing ALL Rating Ranges (After Fix)')
  console.log('-'.repeat(70))
  
  const ratings = [
    { label: '⭐ 10 مذهل', min: 9.1, max: 10 },
    { label: '⭐ 9 ممتاز', min: 8.1, max: 9 },
    { label: '⭐ 8 جيد جداً', min: 7.1, max: 8 },
    { label: '⭐ 7 جيد', min: 6.1, max: 7 },
    { label: '⭐ 6 مقبول', min: 5.1, max: 6 },
    { label: '⭐ 5 متوسط', min: 4.1, max: 5 },
    { label: '⭐ 4 ضعيف', min: 3.1, max: 4 },
  ]
  
  for (const rating of ratings) {
    const testStart = Date.now()
    
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
    
    const testDuration = Date.now() - testStart
    
    let status = '✅'
    if (testDuration > 1000) status = '❌'
    else if (testDuration > 500) status = '⚠️'
    
    console.log(`${status} ${rating.label}: ${testDuration}ms`)
  }
  
  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 SUMMARY')
  console.log('='.repeat(70))
  
  const improvement = beforeDuration - afterDuration
  const improvementPercent = Math.round((improvement / beforeDuration) * 100)
  
  console.log(`\nBefore: ${beforeDuration}ms`)
  console.log(`After:  ${afterDuration}ms`)
  console.log(`Improvement: ${improvement}ms (${improvementPercent}% faster)`)
  
  if (afterDuration < 500) {
    console.log('\n✅ FIXED! Rating filter is now FAST (<500ms)')
  } else if (afterDuration < 1000) {
    console.log('\n⚡ IMPROVED! Rating filter is now acceptable (<1s)')
  } else {
    console.log('\n⚠️  Still slow, may need additional optimization')
  }
  
  console.log('\n' + '='.repeat(70))
}

fixRatingFilterPerformance().catch(console.error)
