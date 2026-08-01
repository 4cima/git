const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function diagnoseIssue() {
  console.log('🔍 Diagnosing vote_average filter performance issue...\n')
  
  // 1. Check all indexes
  console.log('📊 Step 1: Checking ALL indexes on tv_series table')
  console.log('='.repeat(70))
  const indexes = await turso.execute(`
    SELECT name, sql 
    FROM sqlite_master 
    WHERE type='index' AND tbl_name='tv_series' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `)
  
  console.log(`Found ${indexes.rows.length} indexes:\n`)
  indexes.rows.forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.name}`)
    if (row.sql) {
      console.log(`   ${row.sql}`)
    }
    console.log()
  })
  
  // 2. Test vote_average query with EXPLAIN
  console.log('\n📊 Step 2: Testing vote_average query with EXPLAIN')
  console.log('='.repeat(70))
  
  const explainResult = await turso.execute(`
    EXPLAIN QUERY PLAN
    SELECT id, name_ar, vote_average
    FROM tv_series
    ORDER BY vote_average DESC
    LIMIT 60
  `)
  
  console.log('Query Plan:')
  explainResult.rows.forEach(row => {
    console.log(`  ${row.detail || row[3]}`)
  })
  
  // 3. Test actual performance
  console.log('\n📊 Step 3: Testing actual performance (5 runs)')
  console.log('='.repeat(70))
  
  const times = []
  for (let i = 1; i <= 5; i++) {
    const start = Date.now()
    await turso.execute(`
      SELECT id, name_ar, vote_average
      FROM tv_series
      ORDER BY vote_average DESC
      LIMIT 60
    `)
    const duration = Date.now() - start
    times.push(duration)
    console.log(`Run ${i}: ${duration}ms`)
  }
  
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  
  console.log(`\nAverage: ${avgTime}ms`)
  console.log(`Min: ${minTime}ms`)
  console.log(`Max: ${maxTime}ms`)
  
  // 4. Check if idx_series_vote_average exists and is being used
  console.log('\n📊 Step 4: Checking idx_series_vote_average specifically')
  console.log('='.repeat(70))
  
  const voteAvgIndex = indexes.rows.find(row => row.name === 'idx_series_vote_average')
  
  if (voteAvgIndex) {
    console.log('✅ idx_series_vote_average EXISTS')
    console.log(`   ${voteAvgIndex.sql}`)
  } else {
    console.log('❌ idx_series_vote_average DOES NOT EXIST!')
    console.log('   This is the problem! The index was not created.')
  }
  
  // 5. Check competing indexes
  console.log('\n📊 Step 5: Checking for competing/overlapping indexes')
  console.log('='.repeat(70))
  
  const voteRelatedIndexes = indexes.rows.filter(row => 
    row.sql && (row.sql.includes('vote_average') || row.sql.includes('vote_count'))
  )
  
  console.log(`Found ${voteRelatedIndexes.length} vote-related indexes:\n`)
  voteRelatedIndexes.forEach(row => {
    console.log(`- ${row.name}`)
    console.log(`  ${row.sql}`)
    console.log()
  })
  
  // 6. Test with filters applied
  console.log('\n📊 Step 6: Testing with real-world scenario (with genre filter)')
  console.log('='.repeat(70))
  
  const withFilterStart = Date.now()
  await turso.execute({
    sql: `
      SELECT id, name_ar, vote_average, genres_json
      FROM tv_series
      WHERE genres_json LIKE ?
      ORDER BY vote_average DESC
      LIMIT 60
    `,
    args: ['%"name_ar":"دراما"%']
  })
  const withFilterDuration = Date.now() - withFilterStart
  console.log(`With genre filter: ${withFilterDuration}ms`)
  
  // 7. Compare with other sort columns
  console.log('\n📊 Step 7: Comparing with other sort columns')
  console.log('='.repeat(70))
  
  const comparisons = [
    { name: 'popularity', column: 'popularity' },
    { name: 'vote_count', column: 'vote_count' },
    { name: 'first_air_year', column: 'first_air_year' },
    { name: 'created_at', column: 'created_at' },
    { name: 'name_ar', column: 'name_ar' },
  ]
  
  for (const test of comparisons) {
    const start = Date.now()
    await turso.execute(`
      SELECT id, name_ar, ${test.column}
      FROM tv_series
      ORDER BY ${test.column} DESC
      LIMIT 60
    `)
    const duration = Date.now() - start
    console.log(`${test.name}: ${duration}ms`)
  }
  
  // Final diagnosis
  console.log('\n' + '='.repeat(70))
  console.log('\n🎯 DIAGNOSIS SUMMARY')
  console.log('='.repeat(70))
  
  if (!voteAvgIndex) {
    console.log('\n❌ PROBLEM FOUND: idx_series_vote_average is MISSING!')
    console.log('\n💡 SOLUTION: Run the following command to create the index:')
    console.log('\nnode add-sort-indexes.js')
    console.log('\nOr manually create it with:')
    console.log('CREATE INDEX idx_series_vote_average ON tv_series(vote_average DESC)')
  } else if (avgTime > 1000) {
    console.log('\n⚠️  Index exists but query is still slow (>1s)')
    console.log('\n💡 Possible causes:')
    console.log('   1. Index not being used by query planner')
    console.log('   2. Turso cold start / cache issue')
    console.log('   3. Network latency')
    console.log('   4. Large result set processing')
  } else if (avgTime > 500) {
    console.log('\n⚠️  Performance is acceptable but could be better (>500ms)')
    console.log(`   Current average: ${avgTime}ms`)
  } else {
    console.log('\n✅ Performance is GOOD!')
    console.log(`   Average: ${avgTime}ms`)
  }
  
  console.log('\n' + '='.repeat(70))
}

diagnoseIssue().catch(console.error)
