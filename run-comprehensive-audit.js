import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { createClient } from '@libsql/client'

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

async function runComprehensiveAudit() {
  console.log('🔍 COMPREHENSIVE FILTER AUDIT - Complete Run\n')
  console.log('This will take approximately 15-20 minutes\n')
  console.log('='.repeat(80))
  
  let allResults = []
  
  // Load existing phase 1 & 2 results
  if (existsSync('phase1-results.json')) {
    const phase1 = JSON.parse(readFileSync('phase1-results.json', 'utf-8'))
    allResults = [...phase1]
    console.log(`✅ Loaded Phase 1: ${phase1.length} tests`)
  }
  
  if (existsSync('phase2-results.json')) {
    const phase2 = JSON.parse(readFileSync('phase2-results.json', 'utf-8'))
    allResults = [...allResults, ...phase2]
    console.log(`✅ Loaded Phase 2: ${phase2.length} tests`)
  }
  
  console.log(`\nStarting from test #${allResults.length + 1}\n`)
  
  let testNum = allResults.length
  
  // === GENRES ===
  console.log('\n' + '='.repeat(80))
  console.log('🎬 MOVIES - ALL Genres')
  console.log('='.repeat(80))
  
  const movieGenres = ['drama', 'comedy', 'action', 'thriller', 'romance', 'science-fiction', 'horror', 'crime', 'adventure', 'animation', 'family', 'fantasy', 'war']
  
  for (const genre of movieGenres) {
    testNum++
    console.log(`\n[${testNum}] Movies - Genre: ${genre}`)
    
    const timing = testAPI('movies', { genre, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, `API`)
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'genres',
      type: 'movies',
      test: `Genre: ${genre}`,
      filters: `genre=${genre}`,
      sort: 'popularity DESC',
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
    
    // Save incrementally
    if (testNum % 5 === 0) {
      writeFileSync('audit-progress.json', JSON.stringify(allResults, null, 2))
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📺 SERIES - ALL Genres')
  console.log('='.repeat(80))
  
  const seriesGenres = ['drama', 'comedy', 'animation', 'documentary', 'action-adventure', 'sci-fi-fantasy', 'crime', 'reality', 'mystery', 'family', 'kids', 'soap', 'war-politics', 'talk', 'news', 'western', 'romance', 'history']
  
  for (const genre of seriesGenres) {
    testNum++
    console.log(`\n[${testNum}] Series - Genre: ${genre}`)
    
    const timing = testAPI('series', { genre, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, `API`)
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'genres',
      type: 'series',
      test: `Genre: ${genre}`,
      filters: `genre=${genre}`,
      sort: 'popularity DESC',
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
    
    if (testNum % 5 === 0) {
      writeFileSync('audit-progress.json', JSON.stringify(allResults, null, 2))
    }
  }
  
  // === COUNTRIES ===
  console.log('\n' + '='.repeat(80))
  console.log('🎬 MOVIES - ALL Countries')
  console.log('='.repeat(80))
  
  const countries = ['US', 'JP', 'GB', 'CN', 'KR', 'CA', 'FR', 'DE', 'IN', 'TH', 'RU', 'AU', 'BR', 'MX', 'TR']
  
  for (const country of countries) {
    testNum++
    console.log(`\n[${testNum}] Movies - Country: ${country}`)
    
    const timing = testAPI('movies', { country, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, `API`)
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'countries',
      type: 'movies',
      test: `Country: ${country}`,
      filters: `country=${country}`,
      sort: 'popularity DESC',
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
    
    if (testNum % 5 === 0) {
      writeFileSync('audit-progress.json', JSON.stringify(allResults, null, 2))
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📺 SERIES - ALL Countries')
  console.log('='.repeat(80))
  
  for (const country of countries) {
    testNum++
    console.log(`\n[${testNum}] Series - Country: ${country}`)
    
    const timing = testAPI('series', { country, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, `API`)
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'countries',
      type: 'series',
      test: `Country: ${country}`,
      filters: `country=${country}`,
      sort: 'popularity DESC',
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
    
    if (testNum % 5 === 0) {
      writeFileSync('audit-progress.json', JSON.stringify(allResults, null, 2))
    }
  }
  
  // === RATINGS ===
  console.log('\n' + '='.repeat(80))
  console.log('🎬 MOVIES - ALL Rating Ranges')
  console.log('='.repeat(80))
  
  const ratings = ['9.1-10', '8.1-9', '7.1-8', '6.1-7', '5.1-6', '4.1-5']
  
  for (const rating of ratings) {
    testNum++
    console.log(`\n[${testNum}] Movies - Rating: ${rating}`)
    
    const timing = testAPI('movies', { rating_min: rating, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, `API`)
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'ratings',
      type: 'movies',
      test: `Rating: ${rating}`,
      filters: `rating=${rating}`,
      sort: 'popularity DESC',
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📺 SERIES - ALL Rating Ranges')
  console.log('='.repeat(80))
  
  for (const rating of ratings) {
    testNum++
    console.log(`\n[${testNum}] Series - Rating: ${rating}`)
    
    const timing = testAPI('series', { rating_min: rating, page: 1, limit: 72, sort: 'popularity', order: 'desc' }, `API`)
    console.log(`   Timings: ${timing.timings.join('ms, ')}ms | Avg: ${timing.avg > 0 ? timing.avg.toFixed(0) + 'ms' : 'FAILED'}`)
    
    allResults.push({
      phase: 'ratings',
      type: 'series',
      test: `Rating: ${rating}`,
      filters: `rating=${rating}`,
      sort: 'popularity DESC',
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  writeFileSync('audit-progress.json', JSON.stringify(allResults, null, 2))
  console.log(`\n✅ Phase 3 Complete: ${allResults.length} total tests`)
  console.log('\nResults saved to: audit-progress.json')
  
  return allResults
}

runComprehensiveAudit().catch(console.error)
