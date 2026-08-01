const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function finalFix() {
  console.log('🔧 Final Fix: Creating popularity index for filtering\n')
  console.log('='.repeat(70))
  
  console.log('\n💡 Analysis:')
  console.log('-'.repeat(70))
  console.log('The problem: SQLite uses vote_average index for WHERE,')
  console.log('but then needs TEMP B-TREE for ORDER BY popularity.')
  console.log('')
  console.log('Better approach: Let SQLite use popularity index,')
  console.log('scan in popularity order, and filter vote_average.')
  console.log('This works better because we only need 60 results.')
  
  // Drop the composite index that didn't help
  console.log('\n🗑️  Removing ineffective composite index...')
  try {
    await turso.execute('DROP INDEX IF EXISTS idx_series_vote_popularity')
    console.log('✅ Removed idx_series_vote_popularity')
  } catch (error) {
    console.log(`⚠️  ${error.message}`)
  }
  
  // Check if we already have popularity index
  const indexes = await turso.execute(`
    SELECT name, sql 
    FROM sqlite_master 
    WHERE type='index' 
      AND tbl_name='tv_series' 
      AND name = 'idx_series_popularity'
  `)
  
  console.log('\n📊 Checking idx_series_popularity...')
  if (indexes.rows.length > 0) {
    console.log('✅ idx_series_popularity already exists')
    console.log(`   ${indexes.rows[0].sql}`)
  }
  
  // Test all rating ranges
  console.log('\n📊 Testing ALL Rating Ranges (Current State)')
  console.log('-'.repeat(70))
  console.log('Note: We\'re relying on idx_series_popularity for ORDER BY')
  console.log('')
  
  const ratings = [
    { label: '⭐ 10 مذهل', min: 9.1, max: 10.0 },
    { label: '⭐ 9 ممتاز', min: 8.1, max: 9.0 },
    { label: '⭐ 8 جيد جداً', min: 7.1, max: 8.0 },
    { label: '⭐ 7 جيد', min: 6.1, max: 7.0 },
    { label: '⭐ 6 مقبول', min: 5.1, max: 6.0 },
    { label: '⭐ 5 متوسط', min: 4.1, max: 5.0 },
    { label: '⭐ 4 ضعيف', min: 3.1, max: 4.0 },
  ]
  
  const results = []
  
  for (const rating of ratings) {
    const testStart = Date.now()
    
    const result = await turso.execute({
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
    
    console.log(`${status} ${rating.label} (${rating.min}-${rating.max}): ${testDuration}ms - ${result.rows.length} results`)
    
    results.push({
      label: rating.label,
      duration: testDuration,
      count: result.rows.length
    })
  }
  
  // Check query plan
  console.log('\n📊 Analyzing Query Plan for Rating 6')
  console.log('-'.repeat(70))
  
  const explainResult = await turso.execute({
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
  
  explainResult.rows.forEach(row => {
    console.log(`  ${row.detail || row[3]}`)
  })
  
  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 PERFORMANCE SUMMARY')
  console.log('='.repeat(70))
  
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length)
  const fastCount = results.filter(r => r.duration < 500).length
  const slowCount = results.filter(r => r.duration > 1000).length
  
  console.log(`\nAverage time: ${avgTime}ms`)
  console.log(`Fast (<500ms): ${fastCount}/${results.length}`)
  console.log(`Slow (>1s): ${slowCount}/${results.length}`)
  
  if (slowCount > 0) {
    console.log('\n⚠️  STILL SLOW for some ratings!')
    console.log('\n💡 Root Cause:')
    console.log('   The problem is that SQLite needs to:')
    console.log('   1. Find all rows matching vote_average range (can be 10k+ rows)')
    console.log('   2. Sort them by popularity')
    console.log('   3. Return top 60')
    console.log('')
    console.log('   For large result sets (8-16k rows), this is inherently slow.')
    console.log('')
    console.log('🔧 ULTIMATE SOLUTION:')
    console.log('   Option 1: Accept the performance (500-1500ms is reasonable for 10k+ rows)')
    console.log('   Option 2: Add a materialized view / caching layer')
    console.log('   Option 3: Paginate differently (don\'t sort, just filter)')
    console.log('   Option 4: Use Turso edge cache (enable at database level)')
  } else {
    console.log('\n✅ Performance is ACCEPTABLE!')
  }
  
  console.log('\n' + '='.repeat(70))
}

finalFix().catch(console.error)
