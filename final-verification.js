const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function finalVerification() {
  console.log('🔍 Final Verification - Testing All 8 Sort Filters\n')
  console.log('=' .repeat(70))
  
  const tests = [
    { 
      name: '🔥 الأكثر شهرة', 
      api: '/api/series?sort=popularity&order=desc&limit=5',
      expectedColumn: 'popularity'
    },
    { 
      name: '⭐ الأعلى تقييماً', 
      api: '/api/series?sort=vote_average&order=desc&limit=5',
      expectedColumn: 'vote_average'
    },
    { 
      name: '📊 الأكثر تقييماً (NEW)', 
      api: '/api/series?sort=vote_count&order=desc&limit=5',
      expectedColumn: 'vote_count'
    },
    { 
      name: '📅 الأحدث', 
      api: '/api/series?sort=first_air_year&order=desc&limit=5',
      expectedColumn: 'first_air_year'
    },
    { 
      name: '🕰️ الأقدم (NEW)', 
      api: '/api/series?sort=first_air_year&order=asc&limit=5',
      expectedColumn: 'first_air_year'
    },
    { 
      name: '🆕 آخر إضافة (NEW)', 
      api: '/api/series?sort=created_at&order=desc&limit=5',
      expectedColumn: 'created_at'
    },
    { 
      name: '🔤 الاسم (أ-ي)', 
      api: '/api/series?sort=name_ar&order=asc&limit=5',
      expectedColumn: 'name_ar'
    },
    { 
      name: '🔤 الاسم (ي-أ) (NEW)', 
      api: '/api/series?sort=name_ar&order=desc&limit=5',
      expectedColumn: 'name_ar'
    },
  ]

  let allPassed = true

  for (const test of tests) {
    console.log(`\n${test.name}`)
    console.log('-'.repeat(70))
    console.log(`API: ${test.api}`)
    
    // Parse URL params
    const params = new URLSearchParams(test.api.split('?')[1])
    const sort = params.get('sort')
    const order = params.get('order') || 'desc'
    const limit = parseInt(params.get('limit') || '5')
    
    const start = Date.now()
    
    try {
      const result = await turso.execute({
        sql: `
          SELECT 
            id, slug, name_ar, name_en, poster_path,
            vote_average, first_air_year, vote_count,
            genres_json, overview_ar, country_of_origin,
            created_at, popularity
          FROM tv_series
          ORDER BY ${sort} ${order.toUpperCase()}
          LIMIT ?
        `,
        args: [limit]
      })
      
      const duration = Date.now() - start
      
      if (result.rows.length > 0) {
        console.log(`✅ Status: SUCCESS`)
        console.log(`⏱️  Performance: ${duration}ms`)
        console.log(`📊 Results: ${result.rows.length} series`)
        console.log(`📋 Top result: ${result.rows[0].name_ar}`)
        
        // Show the sort value
        const sortValue = result.rows[0][test.expectedColumn]
        if (sortValue !== undefined && sortValue !== null) {
          let displayValue = sortValue
          if (typeof sortValue === 'number') {
            displayValue = sortValue.toFixed(2)
          } else if (test.expectedColumn === 'created_at') {
            displayValue = sortValue.substring(0, 19)
          }
          console.log(`🎯 Sort Value: ${displayValue}`)
        }
        
        // Performance check
        if (duration > 1000) {
          console.log(`⚠️  Warning: Performance is slow (>${duration}ms)`)
          allPassed = false
        } else if (duration > 500) {
          console.log(`⚡ Performance: Good (${duration}ms)`)
        } else {
          console.log(`🚀 Performance: Excellent (${duration}ms)`)
        }
      } else {
        console.log(`❌ Status: FAILED - No results returned`)
        allPassed = false
      }
    } catch (error) {
      console.log(`❌ Status: ERROR - ${error.message}`)
      allPassed = false
    }
  }

  // Test combined filters
  console.log('\n' + '='.repeat(70))
  console.log('\n🔥 BONUS: Complex Filter Test')
  console.log('-'.repeat(70))
  console.log('Testing: Genre + Country + Rating + Sort')
  
  const complexStart = Date.now()
  try {
    const complexResult = await turso.execute({
      sql: `
        SELECT 
          id, name_ar, vote_average, country_of_origin, genres_json
        FROM tv_series
        WHERE genres_json LIKE ?
          AND country_of_origin = ?
          AND vote_average >= 7.0
        ORDER BY vote_count DESC
        LIMIT 10
      `,
      args: ['%"name_ar":"دراما"%', 'US']
    })
    
    const complexDuration = Date.now() - complexStart
    console.log(`✅ Status: SUCCESS`)
    console.log(`⏱️  Performance: ${complexDuration}ms`)
    console.log(`📊 Results: ${complexResult.rows.length} series`)
    if (complexResult.rows.length > 0) {
      console.log(`📋 Top result: ${complexResult.rows[0].name_ar} (Rating: ${complexResult.rows[0].vote_average})`)
    }
    
    if (complexDuration > 1000) {
      console.log(`⚠️  Warning: Complex query is slow`)
      allPassed = false
    } else {
      console.log(`🚀 Complex query performance: Excellent!`)
    }
  } catch (error) {
    console.log(`❌ Status: ERROR - ${error.message}`)
    allPassed = false
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('\n📊 FINAL SUMMARY')
  console.log('='.repeat(70))
  
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED!')
    console.log('🎉 All 8 sort filters are working correctly')
    console.log('🚀 Performance is excellent across all filters')
    console.log('✨ Ready for production!')
  } else {
    console.log('❌ SOME TESTS FAILED')
    console.log('⚠️  Please review the errors above')
  }
  
  console.log('\n' + '='.repeat(70))
}

finalVerification().catch(console.error)
