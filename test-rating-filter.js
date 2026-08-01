const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function testRatingFilter() {
  console.log('🔍 Testing Rating FILTER (not sort) - التقييم 6\n')
  console.log('='.repeat(70))
  
  // Test the actual filter you used
  console.log('\n📊 Testing: Rating Filter = 6 (5.1-6.0 range)')
  console.log('-'.repeat(70))
  
  const start = Date.now()
  
  const result = await turso.execute({
    sql: `
      SELECT 
        id, slug, name_ar, name_en, poster_path,
        vote_average, first_air_year,
        genres_json, overview_ar, country_of_origin
      FROM tv_series
      WHERE vote_average >= ? AND vote_average <= ?
      ORDER BY popularity DESC
      LIMIT 60
    `,
    args: [5.1, 6.0]
  })
  
  const duration = Date.now() - start
  
  console.log(`⏱️  Query Time: ${duration}ms`)
  console.log(`📊 Results Found: ${result.rows.length}`)
  
  if (result.rows.length > 0) {
    console.log(`\nTop 5 results:`)
    result.rows.slice(0, 5).forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.name_ar} - Rating: ${row.vote_average}`)
    })
  }
  
  // Test with EXPLAIN to see query plan
  console.log('\n📊 Query Plan Analysis')
  console.log('-'.repeat(70))
  
  const explainResult = await turso.execute({
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id, name_ar, vote_average
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
  
  // Test all rating ranges
  console.log('\n📊 Testing ALL Rating Ranges')
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
    
    const testResult = await turso.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM tv_series
        WHERE vote_average >= ? AND vote_average <= ?
      `,
      args: [rating.min, rating.max]
    })
    
    const testDuration = Date.now() - testStart
    const count = testResult.rows[0].count
    
    console.log(`${rating.label} (${rating.min}-${rating.max}): ${count} series - ${testDuration}ms`)
  }
  
  // Test the query WITHOUT the rating filter (baseline)
  console.log('\n📊 Baseline: Query WITHOUT rating filter')
  console.log('-'.repeat(70))
  
  const baselineStart = Date.now()
  await turso.execute(`
    SELECT 
      id, slug, name_ar, vote_average
    FROM tv_series
    ORDER BY popularity DESC
    LIMIT 60
  `)
  const baselineDuration = Date.now() - baselineStart
  console.log(`Without filter: ${baselineDuration}ms`)
  
  // Test combined with other filters
  console.log('\n📊 Testing Rating Filter + Genre Filter')
  console.log('-'.repeat(70))
  
  const combinedStart = Date.now()
  await turso.execute({
    sql: `
      SELECT id, name_ar, vote_average
      FROM tv_series
      WHERE vote_average >= ? AND vote_average <= ?
        AND genres_json LIKE ?
      ORDER BY popularity DESC
      LIMIT 60
    `,
    args: [5.1, 6.0, '%"name_ar":"دراما"%']
  })
  const combinedDuration = Date.now() - combinedStart
  console.log(`Rating + Genre: ${combinedDuration}ms`)
  
  // Check indexes related to vote_average
  console.log('\n📊 Checking Indexes for vote_average')
  console.log('-'.repeat(70))
  
  const indexes = await turso.execute(`
    SELECT name, sql 
    FROM sqlite_master 
    WHERE type='index' 
      AND tbl_name='tv_series' 
      AND (sql LIKE '%vote_average%' OR name LIKE '%vote%')
  `)
  
  console.log(`Found ${indexes.rows.length} vote-related indexes:\n`)
  indexes.rows.forEach(row => {
    console.log(`- ${row.name}`)
    if (row.sql) console.log(`  ${row.sql}`)
    console.log()
  })
  
  // Diagnosis
  console.log('\n' + '='.repeat(70))
  console.log('🎯 DIAGNOSIS')
  console.log('='.repeat(70))
  
  if (duration > 5000) {
    console.log('\n❌ CRITICAL: Query is VERY SLOW (>5 seconds)!')
    console.log('\n💡 Problem: The WHERE clause with vote_average range is not using an index efficiently')
    console.log('\n📌 Explanation:')
    console.log('   - Index on vote_average DESC is for SORTING, not for FILTERING')
    console.log('   - Range queries (>= AND <=) may not use the index optimally')
    console.log('   - SQLite has to scan many rows to find matches')
    console.log('\n🔧 Solutions:')
    console.log('   1. Add a composite index: (vote_average, popularity DESC)')
    console.log('   2. Or: Denormalize by adding a vote_average_bucket column')
  } else if (duration > 1000) {
    console.log('\n⚠️  Query is SLOW (>1 second)')
    console.log(`   Current time: ${duration}ms`)
  } else {
    console.log('\n✅ Query performance is GOOD')
    console.log(`   Time: ${duration}ms`)
  }
  
  console.log('\n' + '='.repeat(70))
}

testRatingFilter().catch(console.error)
