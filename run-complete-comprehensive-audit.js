import { createClient } from '@libsql/client'
import { readFileSync, writeFileSync, existsSync } from 'fs'
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

const TIMEOUT = 180000 // 3 minutes

function testViaAPI(type, params, label) {
  const queryString = new URLSearchParams(params).toString()
  const url = `http://localhost:3000/api/${type}?${queryString}`
  
  const timings = []
  
  for (let i = 1; i <= 3; i++) {
    try {
      const start = Date.now()
      execSync(`curl -s "${url}" -o nul --max-time 180`, { 
        encoding: 'utf-8', 
        timeout: TIMEOUT + 5000,
        stdio: 'pipe'
      })
      const duration = Date.now() - start
      timings.push(duration)
    } catch (error) {
      const duration = Date.now() - start
      // If timeout, record as timeout value
      if (duration >= TIMEOUT - 1000) {
        timings.push(TIMEOUT)
      } else {
        timings.push(-1) // Error
      }
    }
  }
  
  const valid = timings.filter(t => t > 0 && t < TIMEOUT)
  const avg = valid.length > 0 ? valid.reduce((a,b) => a+b, 0) / valid.length : -1
  
  return { timings, avg }
}

async function getExplainPlan(sql, args = []) {
  try {
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    return explain.rows.map(r => Object.values(r).join(' | ')).join('\n')
  } catch (e) {
    return `ERROR: ${e.message}`
  }
}

async function getCount(table, whereClause, args = []) {
  try {
    const result = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM ${table} ${whereClause}`,
      args
    })
    return result.rows[0].count
  } catch (e) {
    return -1
  }
}

function classifySeverity(avg) {
  if (avg < 0) return 'FAILED'
  if (avg < 2000) return 'FAST'
  if (avg < 10000) return 'SLOW'
  return 'CRITICAL'
}

async function runComprehensiveAudit() {
  console.log('='
.repeat(100))
  console.log('🔍 COMPREHENSIVE FILTER PERFORMANCE AUDIT - COMPLETE EXECUTION')
  console.log('='
.repeat(100))
  console.log('\nThis audit covers:')
  console.log('  ✓ ALL baseline sorts (10 tests)')
  console.log('  ✓ ALL year filters (22 tests)')  
  console.log('  ✓ ALL movie genres (13 tests)')
  console.log('  ✓ ALL series genres (18 tests)')
  console.log('  ✓ ALL countries for movies (15 tests)')
  console.log('  ✓ ALL countries for series (15 tests)')
  console.log('  ✓ ALL rating ranges for movies (6 tests)')
  console.log('  ✓ ALL rating ranges for series (6 tests)')
  console.log('  ✓ CRITICAL combinations (genre+year, country+year, genre+country, rating+sort)')
  console.log('\nTotal expected tests: ~140+')
  console.log('='
.repeat(100))
  
  let allResults = []
  
  // ========== PHASE 1: Load existing baseline and year results ==========
  console.log('\n\n📦 PHASE 1: Loading existing baseline + year results...\n')
  
  if (existsSync('phase1-results.json') && existsSync('phase2-results.json')) {
    const phase1 = JSON.parse(readFileSync('phase1-results.json', 'utf-8'))
    const phase2 = JSON.parse(readFileSync('phase2-results.json', 'utf-8'))
    allResults.push(...phase1, ...phase2)
    console.log(`✅ Loaded ${phase1.length} baseline tests + ${phase2.length} year tests = ${phase1.length + phase2.length} total`)
  } else {
    console.log('⚠️  Missing phase1/phase2 results - these should already exist!')
  }
  
  // ========== PHASE 3A: ALL GENRES ==========
  console.log('\n\n📦 PHASE 3A: Testing ALL Genres\n')
  console.log('='
.repeat(100))
  
  const movieGenres = [
    'drama', 'comedy', 'action', 'thriller', 'romance', 
    'science-fiction', 'horror', 'crime', 'adventure', 
    'animation', 'family', 'fantasy', 'war'
  ]
  
  const seriesGenres = [
    'drama', 'comedy', 'animation', 'documentary', 
    'action-adventure', 'sci-fi-fantasy', 'crime', 
    'reality', 'mystery', 'family', 'kids', 'soap', 
    'war-politics', 'talk', 'news', 'western', 
    'romance', 'history'
  ]
  
  console.log(`\n🎬 MOVIES - Testing ${movieGenres.length} genres\n`)
  
  for (const genre of movieGenres) {
    console.log(`\n[TEST] Movies - Genre: ${genre}`)
    
    const whereClause = `WHERE genres_json LIKE ?`
    const args = [`%"slug":"${genre}"%`]
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar, movies.poster_path, movies.vote_average
      FROM movies
      ${whereClause}
      ORDER BY popularity DESC
      LIMIT 72
    `
    
    const count = await getCount('movies', whereClause, args)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql, args)
    console.log(`   EXPLAIN: ${explain.substring(0, 80)}...`)
    
    const timing = testViaAPI('movies', { genre, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, genre)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'genres',
      type: 'movies',
      test: `Genre: ${genre}`,
      filters: `genre=${genre}`,
      sort: 'popularity DESC',
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  console.log(`\n\n📺 SERIES - Testing ${seriesGenres.length} genres\n`)
  
  for (const genre of seriesGenres) {
    console.log(`\n[TEST] Series - Genre: ${genre}`)
    
    const whereClause = `WHERE genres_json LIKE ?`
    const args = [`%"slug":"${genre}"%`]
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar, tv_series.poster_path, tv_series.vote_average
      FROM tv_series
      ${whereClause}
      ORDER BY popularity DESC
      LIMIT 72
    `
    
    const count = await getCount('tv_series', whereClause, args)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql, args)
    console.log(`   EXPLAIN: ${explain.substring(0, 80)}...`)
    
    const timing = testViaAPI('series', { genre, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, genre)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'genres',
      type: 'series',
      test: `Genre: ${genre}`,
      filters: `genre=${genre}`,
      sort: 'popularity DESC',
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  // ========== PHASE 3B: ALL COUNTRIES ==========
  console.log('\n\n📦 PHASE 3B: Testing ALL Countries\n')
  console.log('='
.repeat(100))
  
  const countries = ['US', 'JP', 'GB', 'CN', 'KR', 'CA', 'FR', 'DE', 'IN', 'TH', 'RU', 'AU', 'BR', 'MX', 'TR']
  
  console.log(`\n🎬 MOVIES - Testing ${countries.length} countries\n`)
  
  for (const country of countries) {
    console.log(`\n[TEST] Movies - Country: ${country}`)
    
    const whereClause = `WHERE countries_json LIKE ?`
    const args = [`%${country}%`]
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar
      FROM movies
      ${whereClause}
      ORDER BY popularity DESC
      LIMIT 72
    `
    
    const count = await getCount('movies', whereClause, args)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql, args)
    console.log(`   EXPLAIN: ${explain.substring(0, 80)}...`)
    
    const timing = testViaAPI('movies', { country, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, country)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'countries',
      type: 'movies',
      test: `Country: ${country}`,
      filters: `country=${country}`,
      sort: 'popularity DESC',
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  console.log(`\n\n📺 SERIES - Testing ${countries.length} countries\n`)
  
  for (const country of countries) {
    console.log(`\n[TEST] Series - Country: ${country}`)
    
    // Series use country_of_origin column, not countries_json
    const whereClause = `WHERE country_of_origin = ?`
    const args = [country]
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar
      FROM tv_series
      ${whereClause}
      ORDER BY popularity DESC
      LIMIT 72
    `
    
    const count = await getCount('tv_series', whereClause, args)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql, args)
    console.log(`   EXPLAIN: ${explain.substring(0, 80)}...`)
    
    const timing = testViaAPI('series', { country, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, country)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'countries',
      type: 'series',
      test: `Country: ${country}`,
      filters: `country=${country}`,
      sort: 'popularity DESC',
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  // ========== PHASE 3C: ALL RATING RANGES ==========
  console.log('\n\n📦 PHASE 3C: Testing ALL Rating Ranges\n')
  console.log('='
.repeat(100))
  
  const ratings = [
    { value: '9.1-10', min: 9.1, max: 10 },
    { value: '8.1-9', min: 8.1, max: 9 },
    { value: '7.1-8', min: 7.1, max: 8 },
    { value: '6.1-7', min: 6.1, max: 7 },
    { value: '5.1-6', min: 5.1, max: 6 },
    { value: '4.1-5', min: 4.1, max: 5 },
  ]
  
  console.log(`\n🎬 MOVIES - Testing ${ratings.length} rating ranges\n`)
  
  for (const rating of ratings) {
    console.log(`\n[TEST] Movies - Rating: ${rating.value}`)
    
    const whereClause = `WHERE vote_average BETWEEN ${rating.min} AND ${rating.max}`
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar
      FROM movies
      ${whereClause}
      ORDER BY popularity DESC
      LIMIT 72
    `
    
    const count = await getCount('movies', whereClause)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql)
    console.log(`   EXPLAIN: ${explain.substring(0, 80)}...`)
    
    const timing = testViaAPI('movies', { rating_min: rating.value, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, rating.value)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'ratings',
      type: 'movies',
      test: `Rating: ${rating.value}`,
      filters: `rating=${rating.value}`,
      sort: 'popularity DESC',
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  console.log(`\n\n📺 SERIES - Testing ${ratings.length} rating ranges\n`)
  
  for (const rating of ratings) {
    console.log(`\n[TEST] Series - Rating: ${rating.value}`)
    
    const whereClause = `WHERE vote_average BETWEEN ${rating.min} AND ${rating.max}`
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar
      FROM tv_series
      ${whereClause}
      ORDER BY popularity DESC
      LIMIT 72
    `
    
    const count = await getCount('tv_series', whereClause)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql)
    console.log(`   EXPLAIN: ${explain.substring(0, 80)}...`)
    
    const timing = testViaAPI('series', { rating_min: rating.value, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, rating.value)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'ratings',
      type: 'series',
      test: `Rating: ${rating.value}`,
      filters: `rating=${rating.value}`,
      sort: 'popularity DESC',
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  // ========== PHASE 3D: CRITICAL COMBINATIONS ==========
  console.log('\n\n📦 PHASE 3D: Testing CRITICAL Combinations (Answers the LIKE + index question)\n')
  console.log('='
.repeat(100))
  
  console.log('\n🔍 Genre + Year + Sort combinations\n')
  
  const genreYearCombo = [
    { genre: 'action', year: '2023', sort: 'popularity', order: 'desc' },
    { genre: 'drama', year: '2024', sort: 'popularity', order: 'desc' },
    { genre: 'action', year: '1990-1999', sort: 'popularity', order: 'desc' },
  ]
  
  for (const combo of genreYearCombo) {
    console.log(`\n[TEST] Movies - ${combo.genre} + ${combo.year} + ${combo.sort}`)
    
    let whereClause = `WHERE genres_json LIKE '%"slug":"${combo.genre}"%'`
    let args = []
    
    if (combo.year.includes('-')) {
      const [from, to] = combo.year.split('-').map(Number)
      whereClause += ` AND release_year BETWEEN ${from} AND ${to}`
    } else {
      whereClause += ` AND release_year = ${combo.year}`
    }
    
    const sql = `SELECT movies.id FROM movies ${whereClause} ORDER BY ${combo.sort} ${combo.order.toUpperCase()} LIMIT 72`
    
    const count = await getCount('movies', whereClause)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql)
    console.log(`   EXPLAIN: ${explain}`)
    
    const timing = testViaAPI('movies', {
      genre: combo.genre,
      year: combo.year,
      page: 1,
      limit: 72,
      sort: combo.sort,
      order: combo.order
    }, `${combo.genre}+${combo.year}`)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'combinations',
      type: 'movies',
      test: `${combo.genre} + ${combo.year} + ${combo.sort}`,
      filters: `genre=${combo.genre}, year=${combo.year}`,
      sort: `${combo.sort} ${combo.order.toUpperCase()}`,
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  console.log('\n\n🔍 Country + Year + Sort combinations\n')
  
  const countryYearCombo = [
    { country: 'KR', year: '2023', sort: 'popularity', order: 'desc' },
    { country: 'US', year: '2024', sort: 'popularity', order: 'desc' },
  ]
  
  for (const combo of countryYearCombo) {
    console.log(`\n[TEST] Movies - ${combo.country} + ${combo.year} + ${combo.sort}`)
    
    let whereClause = `WHERE countries_json LIKE '%${combo.country}%'`
    
    if (combo.year.includes('-')) {
      const [from, to] = combo.year.split('-').map(Number)
      whereClause += ` AND release_year BETWEEN ${from} AND ${to}`
    } else {
      whereClause += ` AND release_year = ${combo.year}`
    }
    
    const sql = `SELECT movies.id FROM movies ${whereClause} ORDER BY ${combo.sort} ${combo.order.toUpperCase()} LIMIT 72`
    
    const count = await getCount('movies', whereClause)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql)
    console.log(`   EXPLAIN: ${explain}`)
    
    const timing = testViaAPI('movies', {
      country: combo.country,
      year: combo.year,
      page: 1,
      limit: 72,
      sort: combo.sort,
      order: combo.order
    }, `${combo.country}+${combo.year}`)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'combinations',
      type: 'movies',
      test: `${combo.country} + ${combo.year} + ${combo.sort}`,
      filters: `country=${combo.country}, year=${combo.year}`,
      sort: `${combo.sort} ${combo.order.toUpperCase()}`,
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  console.log('\n\n🔍 Genre + Country combinations\n')
  
  const genreCountryCombo = [
    { genre: 'action', country: 'US', sort: 'popularity', order: 'desc' },
    { genre: 'drama', country: 'KR', sort: 'vote_average', order: 'desc' },
  ]
  
  for (const combo of genreCountryCombo) {
    console.log(`\n[TEST] Movies - ${combo.genre} + ${combo.country}`)
    
    const whereClause = `WHERE genres_json LIKE '%"slug":"${combo.genre}"%' AND countries_json LIKE '%${combo.country}%'`
    const sql = `SELECT movies.id FROM movies ${whereClause} ORDER BY ${combo.sort} ${combo.order.toUpperCase()} LIMIT 72`
    
    const count = await getCount('movies', whereClause)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql)
    console.log(`   EXPLAIN: ${explain}`)
    
    const timing = testViaAPI('movies', {
      genre: combo.genre,
      country: combo.country,
      page: 1,
      limit: 72,
      sort: combo.sort,
      order: combo.order
    }, `${combo.genre}+${combo.country}`)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'combinations',
      type: 'movies',
      test: `${combo.genre} + ${combo.country}`,
      filters: `genre=${combo.genre}, country=${combo.country}`,
      sort: `${combo.sort} ${combo.order.toUpperCase()}`,
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  console.log('\n\n🔍 Rating + Different Sort combinations\n')
  
  const ratingSortCombo = [
    { rating: '8.1-9', min: 8.1, max: 9, sort: 'popularity', order: 'desc' },
    { rating: '8.1-9', min: 8.1, max: 9, sort: 'vote_count', order: 'desc' },
    { rating: '8.1-9', min: 8.1, max: 9, sort: 'release_year', order: 'desc' },
  ]
  
  for (const combo of ratingSortCombo) {
    console.log(`\n[TEST] Movies - rating ${combo.rating} + ${combo.sort}`)
    
    const whereClause = `WHERE vote_average BETWEEN ${combo.min} AND ${combo.max}`
    const sql = `SELECT movies.id FROM movies ${whereClause} ORDER BY ${combo.sort} ${combo.order.toUpperCase()} LIMIT 72`
    
    const count = await getCount('movies', whereClause)
    console.log(`   Count: ${count}`)
    
    const explain = await getExplainPlan(sql)
    console.log(`   EXPLAIN: ${explain}`)
    
    const timing = testViaAPI('movies', {
      rating_min: combo.rating,
      page: 1,
      limit: 72,
      sort: combo.sort,
      order: combo.order
    }, `${combo.rating}+${combo.sort}`)
    console.log(`   Timings: [${timing.timings.join(', ')}] → Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'combinations',
      type: 'movies',
      test: `rating ${combo.rating} + ${combo.sort}`,
      filters: `rating=${combo.rating}`,
      sort: `${combo.sort} ${combo.order.toUpperCase()}`,
      count,
      explain,
      timings: timing.timings,
      avg: timing.avg,
      severity: classifySeverity(timing.avg)
    })
  }
  
  // ========== SAVE RESULTS ==========
  writeFileSync('complete-audit-results.json', JSON.stringify(allResults, null, 2))
  
  // ========== FINAL SUMMARY ==========
  console.log('\n\n' + '='
.repeat(100))
  console.log('✅ COMPREHENSIVE AUDIT COMPLETE')
  console.log('='
.repeat(100))
  
  const fast = allResults.filter(r => r.severity === 'FAST')
  const slow = allResults.filter(r => r.severity === 'SLOW')
  const critical = allResults.filter(r => r.severity === 'CRITICAL')
  const failed = allResults.filter(r => r.severity === 'FAILED')
  
  console.log(`\n📊 FINAL SUMMARY:`)
  console.log(`   Total tests executed: ${allResults.length}`)
  console.log(`   ✅ FAST (<2s): ${fast.length}`)
  console.log(`   ⚠️  SLOW (2-10s): ${slow.length}`)
  console.log(`   🚨 CRITICAL (>10s): ${critical.length}`)
  console.log(`   ❌ FAILED: ${failed.length}`)
  
  console.log(`\n💾 Results saved to: complete-audit-results.json`)
  console.log(`\nReady for final analysis and index proposal.`)
}

runComprehensiveAudit().catch(console.error)
