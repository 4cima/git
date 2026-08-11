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

async function phase3() {
  console.log('🔍 Phase 3: Genre, Country, Rating Filters\n')
  console.log('='.repeat(80))
  
  const results = []
  
  // === GENRES ===
  console.log('\n🎬 MOVIES - Genre Filters (Sample)\n')
  
  const movieGenres = ['drama', 'comedy', 'action', 'horror', 'romance']
  
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
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    const countSql = `SELECT COUNT(*) as count FROM movies WHERE genres_json LIKE ?`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    const timing = testViaAPI('movies', {
      genre,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'other-filters',
      type: 'movies',
      test: `Genre: ${genre}`,
      filters: `genre=${genre}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  console.log('\n📺 SERIES - Genre Filters (Sample)\n')
  
  const seriesGenres = ['drama', 'comedy', 'animation', 'documentary', 'crime']
  
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
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    const countSql = `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    const timing = testViaAPI('series', {
      genre,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'other-filters',
      type: 'series',
      test: `Genre: ${genre}`,
      filters: `genre=${genre}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // === COUNTRIES ===
  console.log('\n\n🎬 MOVIES - Country Filters (Sample)\n')
  
  const countries = ['US', 'JP', 'KR', 'GB', 'FR']
  
  for (const country of countries) {
    console.log(`\n[TEST] Movies - Country: ${country}`)
    
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar, movies.poster_path, movies.vote_average
      FROM movies
      WHERE countries_json LIKE ?
      ORDER BY popularity DESC
      LIMIT 72 OFFSET 0
    `
    
    const args = [`%${country}%`]
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    const countSql = `SELECT COUNT(*) as count FROM movies WHERE countries_json LIKE ?`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    const timing = testViaAPI('movies', {
      country,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'other-filters',
      type: 'movies',
      test: `Country: ${country}`,
      filters: `country=${country}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  console.log('\n📺 SERIES - Country Filters (Sample)\n')
  
  for (const country of countries.slice(0, 3)) {
    console.log(`\n[TEST] Series - Country: ${country}`)
    
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar, tv_series.poster_path, tv_series.vote_average
      FROM tv_series
      WHERE country_of_origin = ?
      ORDER BY popularity DESC
      LIMIT 72 OFFSET 0
    `
    
    const args = [country]
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    const countSql = `SELECT COUNT(*) as count FROM tv_series WHERE country_of_origin = ?`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    const timing = testViaAPI('series', {
      country,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'other-filters',
      type: 'series',
      test: `Country: ${country}`,
      filters: `country=${country}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // === RATINGS ===
  console.log('\n\n🎬 MOVIES - Rating Filters (Sample)\n')
  
  const ratings = ['9.1-10', '8.1-9', '7.1-8', '5.1-6']
  
  for (const rating of ratings) {
    console.log(`\n[TEST] Movies - Rating: ${rating}`)
    
    const [min, max] = rating.split('-').map(parseFloat)
    
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar, movies.poster_path, movies.vote_average
      FROM movies
      WHERE vote_average BETWEEN ? AND ?
      ORDER BY popularity DESC
      LIMIT 72 OFFSET 0
    `
    
    const args = [min, max]
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    const countSql = `SELECT COUNT(*) as count FROM movies WHERE vote_average BETWEEN ? AND ?`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    const timing = testViaAPI('movies', {
      rating_min: rating,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'other-filters',
      type: 'movies',
      test: `Rating: ${rating}`,
      filters: `rating=${rating}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  console.log('\n📺 SERIES - Rating Filters (Sample)\n')
  
  for (const rating of ratings.slice(0, 2)) {
    console.log(`\n[TEST] Series - Rating: ${rating}`)
    
    const [min, max] = rating.split('-').map(parseFloat)
    
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar, tv_series.poster_path, tv_series.vote_average
      FROM tv_series
      WHERE vote_average BETWEEN ? AND ?
      ORDER BY popularity DESC
      LIMIT 72 OFFSET 0
    `
    
    const args = [min, max]
    
    console.log('\n   EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    const countSql = `SELECT COUNT(*) as count FROM tv_series WHERE vote_average BETWEEN ? AND ?`
    const count = await turso.execute({ sql: countSql, args })
    console.log(`   Result count: ${count.rows[0].count}`)
    
    const timing = testViaAPI('series', {
      rating_min: rating,
      page: 1,
      limit: 72,
      sort: 'popularity',
      order: 'desc'
    }, `API call`)
    
    results.push({
      phase: 'other-filters',
      type: 'series',
      test: `Rating: ${rating}`,
      filters: `rating=${rating}`,
      sort: 'popularity DESC',
      count: count.rows[0].count,
      explain: explain.rows.map(r => Object.values(r).join(' | ')).join('\n'),
      timings: timing.timings,
      avg: timing.avg,
      severity: timing.avg < 2000 ? 'FAST' : timing.avg < 10000 ? 'SLOW' : 'CRITICAL'
    })
  }
  
  // Save results
  writeFileSync('phase3-results.json', JSON.stringify(results, null, 2))
  console.log('\n\n✅ Phase 3 Complete - Results saved to phase3-results.json')
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

phase3().catch(console.error)
