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

function testViaAPI(type, params, label) {
  const queryString = new URLSearchParams(params).toString()
  const url = `http://localhost:3000/api/${type}?${queryString}`
  
  console.log(`   Testing: ${label}`)
  const timings = []
  
  for (let i = 1; i <= 3; i++) {
    try {
      const start = Date.now()
      execSync(`curl -s "${url}" -o nul`, { encoding: 'utf-8', timeout: 180000, stdio: 'pipe' })
      const duration = Date.now() - start
      timings.push(duration)
      process.stdout.write(`      Run ${i}: ${duration}ms `)
    } catch (error) {
      timings.push(-1)
      process.stdout.write(`      Run ${i}: ERROR `)
    }
  }
  console.log()
  
  const valid = timings.filter(t => t > 0)
  const avg = valid.length > 0 ? valid.reduce((a,b) => a+b, 0) / valid.length : -1
  console.log(`      → Avg: ${avg > 0 ? avg.toFixed(0) + 'ms' : 'FAILED'}`)
  
  return { timings, avg }
}

async function phase2() {
  console.log('🔍 Phase 2: Year Filters (Decades + Exact Years)\n')
  console.log('='.repeat(80))
  
  const results = []
  
  // Test years for movies
  console.log('\n🎬 MOVIES - Year Filters\n')
  
  const yearTests = [
    // Decades
    { year: '2000-2010', label: '2000s (الألفينات)' },
    { year: '1990-1999', label: '1990s (التسعينات)' },
    { year: 'before-1990', label: 'Before 1990 (كلاسيكي)' },
    // Recent exact years
    { year: '2026', label: '2026' },
    { year: '2025', label: '2025' },
    { year: '2024', label: '2024' },
    { year: '2023', label: '2023' },
    { year: '2020', label: '2020' },
    // Older exact years
    { year: '2015', label: '2015' },
    { year: '2010', label: '2010' },
    { year: '2005', label: '2005' },
    { year: '2000', label: '2000' },
    { year: '1995', label: '1995' },
    { year: '1990', label: '1990' }
  ]
  
  for (const test of yearTests) {
    console.log(`\n[TEST] Movies - Year: ${test.label}`)
    
    // Build SQL
    let whereClause = ''
    let args = []
    
    if (test.year === 'before-1990') {
      whereClause = 'WHERE release_year < 1990'
    } else if (test.year.includes('-')) {
      const [from, to] = test.year.split('-').map(Number)
      whereClause = 'WHERE release_year BETWEEN ? AND ?'
      args = [from, to]
    } else {
      whereClause = 'WHERE release_year = ?'
      args = [parseInt(test.year)]
    }
    
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar, movies.poster_path, movies.vote_average, movies.release_year
      FROM movies
      ${whereClause}
      ORDER BY popularity DESC
      LIMIT 72 OFFSET 0
    `
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    // Get count
    const countSql = `SELECT COUNT(*) as count FROM movies ${whereClause}`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    const timing = testViaAPI('movies', {
      year: test.year,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'year-filters',
      type: 'movies',
      test: `Year: ${test.label}`,
      filters: `year=${test.year}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // Test years for series
  console.log('\n\n📺 SERIES - Year Filters\n')
  
  for (const test of yearTests.slice(0, 8)) { // Test subset for series
    console.log(`\n[TEST] Series - Year: ${test.label}`)
    
    let whereClause = ''
    let args = []
    
    if (test.year === 'before-1990') {
      whereClause = 'WHERE first_air_year < 1990'
    } else if (test.year.includes('-')) {
      const [from, to] = test.year.split('-').map(Number)
      whereClause = 'WHERE first_air_year BETWEEN ? AND ?'
      args = [from, to]
    } else {
      whereClause = 'WHERE first_air_year = ?'
      args = [parseInt(test.year)]
    }
    
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar, tv_series.poster_path, tv_series.vote_average, tv_series.first_air_year
      FROM tv_series
      ${whereClause}
      ORDER BY popularity DESC
      LIMIT 72 OFFSET 0
    `
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    const countSql = `SELECT COUNT(*) as count FROM tv_series ${whereClause}`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    const timing = testViaAPI('series', {
      year: test.year,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'year-filters',
      type: 'series',
      test: `Year: ${test.label}`,
      filters: `year=${test.year}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // Save results
  writeFileSync('phase2-results.json', JSON.stringify(results, null, 2))
  console.log('\n\n✅ Phase 2 Complete - Results saved to phase2-results.json')
  console.log(`   Total tests: ${results.length}`)
  
  // Summary
  console.log('\n📊 Quick Summary:')
  const fast = results.filter(r => r.severity === 'FAST').length
  const slow = results.filter(r => r.severity === 'SLOW').length
  const critical = results.filter(r => r.severity === 'CRITICAL').length
  console.log(`   FAST (<2s): ${fast}`)
  console.log(`   SLOW (2-10s): ${slow}`)
  console.log(`   CRITICAL (>10s): ${critical}`)
}

phase2().catch(console.error)
