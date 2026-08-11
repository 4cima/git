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

function testViaAPI(type, params, label, timeout = 180000) {
  const queryString = new URLSearchParams(params).toString()
  const url = `http://localhost:3000/api/${type}?${queryString}`
  
  console.log(`   Testing: ${label}`)
  const timings = []
  
  for (let i = 1; i <= 3; i++) {
    try {
      const start = Date.now()
      execSync(`curl -s "${url}" -o nul --max-time 180`, { 
        encoding: 'utf-8', 
        timeout,
        stdio: 'pipe' 
      })
      const duration = Date.now() - start
      timings.push(duration)
      process.stdout.write(`      Run ${i}: ${duration}ms `)
    } catch (error) {
      const duration = Date.now() - start
      if (duration >= timeout - 1000) {
        timings.push(timeout)
        process.stdout.write(`      Run ${i}: TIMEOUT (${timeout}ms) `)
      } else {
        timings.push(-1)
        process.stdout.write(`      Run ${i}: ERROR `)
      }
    }
  }
  console.log()
  
  const valid = timings.filter(t => t > 0 && t < timeout)
  const avg = valid.length > 0 ? valid.reduce((a,b) => a+b, 0) / valid.length : -1
  console.log(`      → Avg: ${avg > 0 ? avg.toFixed(0) + 'ms' : 'FAILED'}`)
  
  return { timings, avg }
}

async function testAllGenres() {
  console.log('🔍 Phase 3a: ALL Genre Filters - Complete Test\n')
  console.log('='.repeat(80))
  
  const results = []
  
  // ALL MOVIE GENRES
  console.log('\n🎬 MOVIES - ALL Genres\n')
  
  const movieGenres = [
    'drama', 'comedy', 'action', 'thriller', 'romance', 
    'science-fiction', 'horror', 'crime', 'adventure', 
    'animation', 'family', 'fantasy', 'war'
  ]
  
  for (const genre of movieGenres) {
    console.log(`\n[TEST] Movies - Genre: ${genre}`)
    
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar, movies.poster_path, movies.vote_average
      FROM movies
      WHERE genres_json LIKE ?
      ORDER BY popularity DESC
      LIMIT 72 OFFSET 0
    `
    
    const args = [`%"slug":"${genre}"%`]
    
    // Get count first
    const countSql = `SELECT COUNT(*) as count FROM movies WHERE genres_json LIKE ?`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    // EXPLAIN QUERY PLAN
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    // API Timing
    const timing = testViaAPI('movies', {
      genre,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'genres',
      type: 'movies',
      test: `Genre: ${genre}`,
      filters: `genre=${genre}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // ALL SERIES GENRES
  console.log('\n\n📺 SERIES - ALL Genres\n')
  
  const seriesGenres = [
    'drama', 'comedy', 'animation', 'documentary', 
    'action-adventure', 'sci-fi-fantasy', 'crime', 
    'reality', 'mystery', 'family', 'kids', 'soap', 
    'war-politics', 'talk', 'news', 'western', 
    'romance', 'history'
  ]
  
  for (const genre of seriesGenres) {
    console.log(`\n[TEST] Series - Genre: ${genre}`)
    
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar, tv_series.poster_path, tv_series.vote_average
      FROM tv_series
      WHERE genres_json LIKE ?
      ORDER BY popularity DESC
      LIMIT 72 OFFSET 0
    `
    
    const args = [`%"slug":"${genre}"%`]
    
    const countSql = `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    const timing = testViaAPI('series', {
      genre,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'genres',
      type: 'series',
      test: `Genre: ${genre}`,
      filters: `genre=${genre}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 0 ? 'FAILED' : timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // Save results
  writeFileSync('phase3a-genres-results.json', JSON.stringify(results, null, 2))
  console.log('\n\n✅ Phase 3a Complete - Results saved to phase3a-genres-results.json')
  console.log(`   Total tests: ${results.length}`)
  
  // Summary
  console.log('\n📊 Quick Summary:')
  const fast = results.filter(r => r.severity === 'FAST').length
  const slow = results.filter(r => r.severity === 'SLOW').length
  const critical = results.filter(r => r.severity === 'CRITICAL').length
  const failed = results.filter(r => r.severity === 'FAILED').length
  console.log(`   FAST (<2s): ${fast}`)
  console.log(`   SLOW (2-10s): ${slow}`)
  console.log(`   CRITICAL (>10s): ${critical}`)
  console.log(`   FAILED: ${failed}`)
}

testAllGenres().catch(console.error)
