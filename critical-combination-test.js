import { createClient } from '@libsql/client'
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const turso = createClient({
  url: envVars.TURSO_DATABASE_URL,
  authToken: envVars.TURSO_AUTH_TOKEN,
})

function testAPI(type, params, label) {
  const queryString = new URLSearchParams(params).toString()
  const url = `http://localhost:3000/api/${type}?${queryString}`
  
  const timings = []
  
  for (let i = 1; i <= 3; i++) {
    try {
      const start = Date.now()
      execSync(`curl -s "${url}" -o nul --max-time 180`, { 
        encoding: 'utf-8', 
        timeout: 185000,
        stdio: 'pipe'
      })
      const duration = Date.now() - start
      timings.push(duration)
    } catch (error) {
      timings.push(-1)
    }
  }
  
  const valid = timings.filter(t => t > 0)
  const avg = valid.length > 0 ? valid.reduce((a,b) => a+b, 0) / valid.length : -1
  
  return { timings, avg }
}

async function criticalTests() {
  console.log('🔍 CRITICAL QUESTION: Does composite index help with LIKE filters?\n')
  console.log('Testing combinations to understand index behavior\n')
  console.log('='.repeat(80))
  
  const results = []
  let testNum = 0
  
  // ===  CRITICAL TEST: Genre + Year + Sort ===
  console.log('\n📋 TEST SET 1: Genre + Year + Sort (CRITICAL for understanding index behavior)\n')
  
  const genreYearTests = [
    { genre: 'action', year: '2023', sort: 'popularity', order: 'desc', label: 'action + 2023 + popularity' },
    { genre: 'drama', year: '2024', sort: 'popularity', order: 'desc', label: 'drama + 2024 + popularity' },
    { genre: 'action', year: '1990-1999', sort: 'popularity', order: 'desc', label: 'action + 1990s + popularity' },
  ]
  
  for (const test of genreYearTests) {
    testNum++
    console.log(`\n[${testNum}] Movies - ${test.label}`)
    
    // Build SQL
    let whereClause = `WHERE genres_json LIKE '%"slug":"${test.genre}"%'`
    let args = []
    
    if (test.year.includes('-')) {
      const [from, to] = test.year.split('-').map(Number)
      whereClause += ` AND release_year BETWEEN ${from} AND ${to}`
    } else {
      whereClause += ` AND release_year = ${test.year}`
    }
    
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar
      FROM movies
      ${whereClause}
      ORDER BY ${test.sort} ${test.order.toUpperCase()}
      LIMIT 72
    `
    
    console.log('   EXPLAIN QUERY PLAN:')
    try {
      const explain = await turso.execute(`EXPLAIN QUERY PLAN ${sql}`)
      explain.rows.forEach(row => {
        console.log(`      ${Object.values(row).join(' | ')}`)
      })
    } catch (e) {
      console.log(`      ERROR: ${e.message}`)
    }
    
    const timing = testAPI('movies', {
      genre: test.genre,
      year: test.year,
      page: 1,
      limit: 72,
      sort: test.sort,
      order: test.order
    }, `API`)
    
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    results.push({
      phase: 'combinations',
      type: 'movies',
      test: test.label,
      filters: `genre=${test.genre}, year=${test.year}`,
      sort: `${test.sort} ${test.order.toUpperCase()}`,
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // === TEST SET 2: Country + Year + Sort ===
  console.log('\n\n📋 TEST SET 2: Country + Year + Sort\n')
  
  const countryYearTests = [
    { country: 'KR', year: '2023', sort: 'popularity', order: 'desc', label: 'KR + 2023 + popularity' },
    { country: 'US', year: '2024', sort: 'popularity', order: 'desc', label: 'US + 2024 + popularity' },
    { country: 'KR', year: '1990-1999', sort: 'release_year', order: 'asc', label: 'KR + 1990s + oldest' },
  ]
  
  for (const test of countryYearTests) {
    testNum++
    console.log(`\n[${testNum}] Movies - ${test.label}`)
    
    let whereClause = `WHERE countries_json LIKE '%${test.country}%'`
    
    if (test.year.includes('-')) {
      const [from, to] = test.year.split('-').map(Number)
      whereClause += ` AND release_year BETWEEN ${from} AND ${to}`
    } else {
      whereClause += ` AND release_year = ${test.year}`
    }
    
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar
      FROM movies
      ${whereClause}
      ORDER BY ${test.sort} ${test.order.toUpperCase()}
      LIMIT 72
    `
    
    console.log('   EXPLAIN QUERY PLAN:')
    try {
      const explain = await turso.execute(`EXPLAIN QUERY PLAN ${sql}`)
      explain.rows.forEach(row => {
        console.log(`      ${Object.values(row).join(' | ')}`)
      })
    } catch (e) {
      console.log(`      ERROR: ${e.message}`)
    }
    
    const timing = testAPI('movies', {
      country: test.country,
      year: test.year,
      page: 1,
      limit: 72,
      sort: test.sort,
      order: test.order
    }, `API`)
    
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    results.push({
      phase: 'combinations',
      type: 'movies',
      test: test.label,
      filters: `country=${test.country}, year=${test.year}`,
      sort: `${test.sort} ${test.order.toUpperCase()}`,
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // === TEST SET 3: Genre + Country ===
  console.log('\n\n📋 TEST SET 3: Genre + Country\n')
  
  const genreCountryTests = [
    { genre: 'action', country: 'US', sort: 'popularity', order: 'desc', label: 'action + US' },
    { genre: 'drama', country: 'KR', sort: 'vote_average', order: 'desc', label: 'drama + KR + rating' },
  ]
  
  for (const test of genreCountryTests) {
    testNum++
    console.log(`\n[${testNum}] Movies - ${test.label}`)
    
    const whereClause = `WHERE genres_json LIKE '%"slug":"${test.genre}"%' AND countries_json LIKE '%${test.country}%'`
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar
      FROM movies
      ${whereClause}
      ORDER BY ${test.sort} ${test.order.toUpperCase()}
      LIMIT 72
    `
    
    console.log('   EXPLAIN QUERY PLAN:')
    try {
      const explain = await turso.execute(`EXPLAIN QUERY PLAN ${sql}`)
      explain.rows.forEach(row => {
        console.log(`      ${Object.values(row).join(' | ')}`)
      })
    } catch (e) {
      console.log(`      ERROR: ${e.message}`)
    }
    
    const timing = testAPI('movies', {
      genre: test.genre,
      country: test.country,
      page: 1,
      limit: 72,
      sort: test.sort,
      order: test.order
    }, `API`)
    
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    results.push({
      phase: 'combinations',
      type: 'movies',
      test: test.label,
      filters: `genre=${test.genre}, country=${test.country}`,
      sort: `${test.sort} ${test.order.toUpperCase()}`,
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // === TEST SET 4: Rating + Sort ===
  console.log('\n\n📋 TEST SET 4: Rating + Different Sorts\n')
  
  const ratingTests = [
    { rating: '8.1-9', sort: 'popularity', order: 'desc', label: 'rating 8-9 + popularity' },
    { rating: '8.1-9', sort: 'vote_count', order: 'desc', label: 'rating 8-9 + vote_count' },
    { rating: '8.1-9', sort: 'release_year', order: 'desc', label: 'rating 8-9 + newest' },
  ]
  
  for (const test of ratingTests) {
    testNum++
    console.log(`\n[${testNum}] Movies - ${test.label}`)
    
    const [min, max] = test.rating.split('-').map(parseFloat)
    const whereClause = `WHERE vote_average BETWEEN ${min} AND ${max}`
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar
      FROM movies
      ${whereClause}
      ORDER BY ${test.sort} ${test.order.toUpperCase()}
      LIMIT 72
    `
    
    console.log('   EXPLAIN QUERY PLAN:')
    try {
      const explain = await turso.execute(`EXPLAIN QUERY PLAN ${sql}`)
      explain.rows.forEach(row => {
        console.log(`      ${Object.values(row).join(' | ')}`)
      })
    } catch (e) {
      console.log(`      ERROR: ${e.message}`)
    }
    
    const timing = testAPI('movies', {
      rating_min: test.rating,
      page: 1,
      limit: 72,
      sort: test.sort,
      order: test.order
    }, `API`)
    
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    results.push({
      phase: 'combinations',
      type: 'movies',
      test: test.label,
      filters: `rating=${test.rating}`,
      sort: `${test.sort} ${test.order.toUpperCase()}`,
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // Save results
  writeFileSync('critical-combinations-results.json', JSON.stringify(results, null, 2))
  
  console.log('\n\n' + '='.repeat(80))
  console.log('✅ Critical Combination Tests Complete')
  console.log('='.repeat(80))
  console.log(`\nTotal tests: ${results.length}`)
  console.log('\n📊 Summary:')
  const fast = results.filter(r => r.severity === 'FAST').length
  const slow = results.filter(r => r.severity === 'SLOW').length
  const critical = results.filter(r => r.severity === 'CRITICAL').length
  const failed = results.filter(r => r.severity === 'FAILED').length
  console.log(`   FAST (<2s): ${fast}`)
  console.log(`   SLOW (2-10s): ${slow}`)
  console.log(`   CRITICAL (>10s): ${critical}`)
  console.log(`   FAILED: ${failed}`)
  
  console.log('\nResults saved to: critical-combinations-results.json')
}

criticalTests().catch(console.error)
