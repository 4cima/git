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

// Test via API
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

async function phase1() {
  console.log('🔍 Phase 1: Baseline + All Sort Options (No Filters)\n')
  console.log('='.repeat(80))
  
  const results = []
  
  // MOVIES
  console.log('\n🎬 MOVIES - Baseline Sorts\n')
  
  const movieSorts = [
    { value: 'popularity', order: 'desc', label: 'الأكثر شهرة' },
    { value: 'vote_average', order: 'desc', label: 'الأعلى تقييماً' },
    { value: 'vote_count', order: 'desc', label: 'الأكثر تقييماً' },
    { value: 'release_year', order: 'desc', label: 'الأحدث' },
    { value: 'release_year', order: 'asc', label: 'الأقدم' }
  ]
  
  for (const sort of movieSorts) {
    console.log(`\n[TEST] Movies - ${sort.label} (${sort.value} ${sort.order.toUpperCase()})`)
    
    // EXPLAIN QUERY PLAN
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
             movies.vote_average, movies.release_year, movies.genres_json, movies.overview_ar
      FROM movies
      ORDER BY ${sort.value} ${sort.order.toUpperCase()}
      LIMIT 72 OFFSET 0
    `
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute(`EXPLAIN QUERY PLAN ${sql}`)
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    // API Timing
    const timing = testViaAPI('movies', {
      page: 1,
      limit: 72,
      sort: sort.value,
      order: sort.order
    }, `API call`)
    
    results.push({
      phase: 'baseline',
      type: 'movies',
      test: `No filters - ${sort.label}`,
      filters: 'none',
      sort: `${sort.value} ${sort.order.toUpperCase()}`,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // SERIES
  console.log('\n\n📺 SERIES - Baseline Sorts\n')
  
  const seriesSorts = [
    { value: 'popularity', order: 'desc', label: 'الأكثر شهرة' },
    { value: 'vote_average', order: 'desc', label: 'الأعلى تقييماً' },
    { value: 'vote_count', order: 'desc', label: 'الأكثر تقييماً' },
    { value: 'first_air_year', order: 'desc', label: 'الأحدث' },
    { value: 'first_air_year', order: 'asc', label: 'الأقدم' }
  ]
  
  for (const sort of seriesSorts) {
    console.log(`\n[TEST] Series - ${sort.label} (${sort.value} ${sort.order.toUpperCase()})`)
    
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar, tv_series.name_en, tv_series.poster_path,
             tv_series.vote_average, tv_series.first_air_year, tv_series.genres_json
      FROM tv_series
      ORDER BY ${sort.value} ${sort.order.toUpperCase()}
      LIMIT 72 OFFSET 0
    `
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute(`EXPLAIN QUERY PLAN ${sql}`)
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    const timing = testViaAPI('series', {
      page: 1,
      limit: 72,
      sort: sort.value,
      order: sort.order
    }, `API call`)
    
    results.push({
      phase: 'baseline',
      type: 'series',
      test: `No filters - ${sort.label}`,
      filters: 'none',
      sort: `${sort.value} ${sort.order.toUpperCase()}`,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // Save results
  writeFileSync('phase1-results.json', JSON.stringify(results, null, 2))
  console.log('\n\n✅ Phase 1 Complete - Results saved to phase1-results.json')
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

phase1().catch(console.error)
