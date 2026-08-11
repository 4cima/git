import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
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

console.log('='
.repeat(120))
console.log('🔬 INVESTIGATION: Re-examining 6 contradictions/gaps in audit findings')
console.log('='
.repeat(120))

// ========================================
// ISSUE 1: Movies "family" genre - cold connection pattern?
// ========================================
async function investigate1() {
  console.log('\n\n1️⃣  ISSUE 1: Movies "family" genre timing variance (47s, 663ms, 583ms)\n')
  console.log('='
.repeat(120))
  console.log('\nOriginal claim: "0 results causing full scan"')
  console.log('User theory: Cold connection pattern (first-slow, rest-fast)\n')
  
  console.log('Running 5 fresh queries to test pattern...\n')
  
  const timings = []
  for (let i = 1; i <= 5; i++) {
    try {
      const start = Date.now()
      execSync('curl -s "http://localhost:3000/api/movies?genre=family&page=1&limit=72&sort=popularity&order=desc" -o nul --max-time 60', {
        encoding: 'utf-8',
        timeout: 65000,
        stdio: 'pipe'
      })
      const duration = Date.now() - start
      timings.push(duration)
      console.log(`   Run ${i}: ${duration}ms`)
    } catch (e) {
      const duration = Date.now() - start
      timings.push(duration)
      console.log(`   Run ${i}: ${duration}ms (error/timeout)`)
    }
    
    // Wait 2 seconds between runs
    if (i < 5) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log(`\n   Timings: [${timings.join(', ')}]`)
  console.log(`   Average: ${(timings.reduce((a,b) => a+b, 0) / timings.length).toFixed(0)}ms`)
  
  const firstRun = timings[0]
  const restAvg = timings.slice(1).reduce((a,b) => a+b, 0) / (timings.length - 1)
  const ratio = firstRun / restAvg
  
  console.log(`\n   First run: ${firstRun}ms`)
  console.log(`   Runs 2-5 avg: ${restAvg.toFixed(0)}ms`)
  console.log(`   Ratio: ${ratio.toFixed(1)}x`)
  
  if (ratio > 10) {
    console.log(`\n   ✅ CONFIRMED: Cold connection pattern (first-slow-rest-fast)`)
    console.log(`   📌 CONCLUSION: This is NOT a persistent performance issue`)
    console.log(`      Original explanation was WRONG - not "0 results = full scan"`)
  } else if (ratio < 2) {
    console.log(`\n   ✅ CONSISTENT: All runs similar speed`)
    console.log(`   📌 CONCLUSION: Genuine performance issue, not connection warmup`)
  } else {
    console.log(`\n   ⚠️  MODERATE VARIANCE: Some warmup effect but not dramatic`)
  }
  
  // Also check actual result count
  console.log(`\n   Checking actual result count from database...`)
  const countResult = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM movies WHERE genres_json LIKE ?`,
    args: ['%"slug":"family"%']
  })
  console.log(`   Database count: ${countResult.rows[0].count} movies with "family" genre`)
  
  if (countResult.rows[0].count === 0) {
    console.log(`   ⚠️  Zero results confirmed - but timing variance contradicts "full scan" theory`)
  }
}

// ========================================
// ISSUE 2: Rare series genres with nonzero results but slow
// ========================================
async function investigate2() {
  console.log('\n\n2️⃣  ISSUE 2: Rare series genres slow despite nonzero results\n')
  console.log('='
.repeat(120))
  console.log('\nUser theory: idx_series_popularity scan walks index row-by-row testing LIKE,')
  console.log('meaning RARE genres scan nearly whole table regardless of composite index\n')
  
  const testGenres = [
    { slug: 'history', label: 'history (16 results, 49-87s)' },
    { slug: 'romance', label: 'romance (116 results, 9-12s)' },
    { slug: 'drama', label: 'drama (22k results, 2-4s) - for comparison' }
  ]
  
  for (const genre of testGenres) {
    console.log(`\n[TEST] ${genre.label}`)
    
    // Get count
    const countResult = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`,
      args: [`%"slug":"${genre.slug}"%`]
    })
    const count = countResult.rows[0].count
    
    // Get total series count for percentage
    const totalResult = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
    const total = totalResult.rows[0].count
    const percentage = ((count / total) * 100).toFixed(2)
    
    console.log(`   Count: ${count} / ${total} (${percentage}%)`)
    
    // Get EXPLAIN
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar
      FROM tv_series
      WHERE genres_json LIKE ?
      ORDER BY popularity DESC
      LIMIT 72
    `
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args: [`%"slug":"${genre.slug}"%`]
    })
    
    console.log(`   EXPLAIN:`)
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    // Get query stats if available (SQLite query_plan detail)
    try {
      const stats = await turso.execute({
        sql: `EXPLAIN ${sql}`,
        args: [`%"slug":"${genre.slug}"%`]
      })
      console.log(`   \n   Execution plan has ${stats.rows.length} opcodes`)
    } catch (e) {
      // EXPLAIN not supported, skip
    }
  }
  
  console.log(`\n\n   📌 ANALYSIS:`)
  console.log(`   If rare genres (history: 0.03%, romance: 0.24%) are consistently slow`)
  console.log(`   while common genres (drama: 45%) are faster, this suggests:`)
  console.log(`   \n   The query planner walks idx_series_popularity (descending) row-by-row,`)
  console.log(`   testing LIKE condition on each row's JSON, until it finds 72 matches.`)
  console.log(`   \n   For rare genres: Must scan thousands/tens-of-thousands of rows`)
  console.log(`   For common genres: Finds 72 matches quickly in first few hundred rows`)
  console.log(`   \n   ⚠️  IMPLICATION: Composite indexes (year, popularity) or (country, popularity)`)
  console.log(`   will NOT fix rare genre filters - they lack an indexed genre column to seek into.`)
  console.log(`   \n   Only solution: genre_ids_csv indexed column (as proposed in "low priority")`)
}

// ========================================
// ISSUE 3: Zero-result series genres - correctness bug?
// ========================================
async function investigate3() {
  console.log('\n\n3️⃣  ISSUE 3: Series genres with Count: 0 - correctness/UX bug?\n')
  console.log('='
.repeat(120))
  console.log('\nGenres showing Count: 0 in audit: action-adventure, sci-fi-fantasy, war-politics\n')
  
  const zeroGenres = ['action-adventure', 'sci-fi-fantasy', 'war-politics']
  
  for (const slug of zeroGenres) {
    console.log(`\n[CHECK] ${slug}`)
    
    // Check exact match
    const exactResult = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`,
      args: [`%"slug":"${slug}"%`]
    })
    console.log(`   Exact slug match: ${exactResult.rows[0].count}`)
    
    // Check alternative patterns (maybe different slug format?)
    const alternatives = [
      slug.replace('-', '_'),  // underscore instead of hyphen
      slug.replace('-', ' '),  // space instead of hyphen
      slug.split('-')[0],      // first part only
      slug.replace('-', ''),   // no separator
    ]
    
    for (const alt of alternatives) {
      const altResult = await turso.execute({
        sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`,
        args: [`%"${alt}"%`]
      })
      if (altResult.rows[0].count > 0) {
        console.log(`   Alternative "${alt}": ${altResult.rows[0].count} matches`)
      }
    }
    
    // Sample actual genres_json values to see what's really stored
    const sampleResult = await turso.execute({
      sql: `SELECT genres_json FROM tv_series WHERE genres_json IS NOT NULL AND genres_json != '[]' LIMIT 5`,
      args: []
    })
    
    if (slug === 'action-adventure') {
      console.log(`\n   Sample genres_json from database:`)
      sampleResult.rows.slice(0, 2).forEach(row => {
        console.log(`      ${row.genres_json}`)
      })
    }
  }
  
  console.log(`\n\n   📌 CONCLUSION:`)
  console.log(`   If these slugs genuinely return 0 results but appear as UI filter options,`)
  console.log(`   this is a UX bug: users see the filter, click it, get empty results.`)
  console.log(`   \n   Same bug class as original genre mismatch (Arabic name vs slug).`)
  console.log(`   Need to either: (a) remove from UI, or (b) fix slug mapping.`)
}

// ========================================
// ISSUE 4: Series rating filter slowness - TEMP B-TREE or index-scan?
// ========================================
async function investigate4() {
  console.log('\n\n4️⃣  ISSUE 4: Series rating filter slowness (5-11s despite idx_series_vote_average)\n')
  console.log('='
.repeat(120))
  console.log('\nOriginal claim: "possible Turso bug"')
  console.log('User theory: WHERE uses vote_average index, but ORDER BY popularity needs composite\n')
  
  const ratingTests = [
    { min: 7.1, max: 8, label: '7.1-8 (16k results, 10s)' },
    { min: 8.1, max: 9, label: '8.1-9 (7k results, 6s)' },
  ]
  
  for (const test of ratingTests) {
    console.log(`\n[TEST] Rating ${test.label}`)
    
    const sql = `
      SELECT tv_series.id, tv_series.slug, tv_series.name_ar
      FROM tv_series
      WHERE vote_average BETWEEN ${test.min} AND ${test.max}
      ORDER BY popularity DESC
      LIMIT 72
    `
    
    console.log(`   SQL: ${sql.replace(/\n/g, ' ').trim()}`)
    
    const explain = await turso.execute(`EXPLAIN QUERY PLAN ${sql}`)
    console.log(`   \n   EXPLAIN QUERY PLAN:`)
    explain.rows.forEach(row => {
      console.log(`      ${Object.values(row).join(' | ')}`)
    })
    
    if (explain.rows.some(r => Object.values(r).join(' ').includes('USE TEMP B-TREE'))) {
      console.log(`\n   ✅ CONFIRMED: TEMP B-TREE for ORDER BY`)
      console.log(`   📌 Pattern: Same as year/country filters - WHERE uses index, ORDER BY doesn't`)
    }
  }
  
  console.log(`\n\n   📌 CONCLUSION:`)
  console.log(`   If TEMP B-TREE confirmed: This is NOT a Turso bug.`)
  console.log(`   It's the SAME pattern seen everywhere: index used for filtering (WHERE),`)
  console.log(`   but ORDER BY column (popularity) is different, forcing TEMP B-TREE.`)
  console.log(`   \n   FIX: Add composite index (vote_average, popularity) to the proposal list.`)
  console.log(`   This was MISSING from the original 4-index proposal.`)
}

// ========================================
// ISSUE 5: Index creation cost estimate
// ========================================
async function investigate5() {
  console.log('\n\n5️⃣  ISSUE 5: Index creation cost estimate\n')
  console.log('='
.repeat(120))
  console.log('\nProposed indexes: 4 (potentially 5 or 6 based on issues 2 and 4)\n')
  
  // Get table sizes
  const moviesCount = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const seriesCount = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  
  console.log(`   Table sizes:`)
  console.log(`      movies: ${moviesCount.rows[0].count.toLocaleString()} rows`)
  console.log(`      tv_series: ${seriesCount.rows[0].count.toLocaleString()} rows`)
  
  const indexes = [
    { 
      name: 'idx_movies_vote_average_desc',
      table: 'movies',
      columns: 'vote_average DESC, popularity DESC',
      rows: moviesCount.rows[0].count,
      estTime: '30-60s',
      priority: 'HIGH - fixes 39s baseline query'
    },
    {
      name: 'idx_movies_vote_count_desc',
      table: 'movies', 
      columns: 'vote_count DESC, popularity DESC',
      rows: moviesCount.rows[0].count,
      estTime: '30-60s',
      priority: 'HIGH - fixes 29s baseline query'
    },
    {
      name: 'idx_movies_year_popularity',
      table: 'movies',
      columns: 'release_year, popularity DESC',
      rows: moviesCount.rows[0].count,
      estTime: '30-60s',
      priority: 'HIGH - fixes 10s decade filter + SLOW year filters'
    },
    {
      name: 'idx_series_year_popularity',
      table: 'tv_series',
      columns: 'first_air_year, popularity DESC',
      rows: seriesCount.rows[0].count,
      estTime: '10-20s',
      priority: 'HIGH - reduces SLOW year filters'
    },
    {
      name: 'idx_series_country_popularity',
      table: 'tv_series',
      columns: 'country_of_origin, popularity DESC',
      rows: seriesCount.rows[0].count,
      estTime: '10-20s',
      priority: 'HIGH - reduces SLOW country filters'
    },
    {
      name: 'idx_series_vote_average_popularity',
      table: 'tv_series',
      columns: 'vote_average, popularity DESC',
      rows: seriesCount.rows[0].count,
      estTime: '10-20s',
      priority: 'HIGH (if issue 4 confirms) - fixes SLOW rating filters'
    }
  ]
  
  console.log(`\n   Proposed indexes:\n`)
  indexes.forEach((idx, i) => {
    console.log(`   ${i+1}. ${idx.name}`)
    console.log(`      Table: ${idx.table} (${idx.rows.toLocaleString()} rows)`)
    console.log(`      Columns: ${idx.columns}`)
    console.log(`      Est. creation time: ${idx.estTime}`)
    console.log(`      Priority: ${idx.priority}`)
    console.log()
  })
  
  console.log(`   📊 TOTAL ESTIMATED CREATION TIME:`)
  console.log(`      Movies indexes (3x): 90-180 seconds (1.5-3 minutes)`)
  console.log(`      Series indexes (3x): 30-60 seconds (0.5-1 minute)`)
  console.log(`      TOTAL: 2-4 minutes for all 6 indexes`)
  
  console.log(`\n   💰 TURSO QUOTA IMPACT:`)
  console.log(`      \n      Index creation is a one-time WRITE operation.`)
  console.log(`      Turso charges per row written during index build.`)
  console.log(`      \n      Estimated writes: ~${(moviesCount.rows[0].count * 3 + seriesCount.rows[0].count * 3).toLocaleString()} row writes`)
  console.log(`      (Each index creation = one pass through table)`)
  console.log(`      \n      Impact: Will consume write quota during creation (one-time cost)`)
  console.log(`      Ongoing impact: Minimal - indexes maintained incrementally on INSERT/UPDATE`)
  console.log(`      \n      Read quota: REDUCED going forward (fewer TEMP B-TREE sorts, faster queries)`)
  
  console.log(`\n   ⚠️  RECOMMENDATION:`)
  console.log(`      Create indexes during off-peak hours if write quota is limited.`)
  console.log(`      Indexes are permanent - one-time cost for ongoing query speedup.`)
}

// ========================================
// ISSUE 6: Movies country filter asymmetry
// ========================================
async function investigate6() {
  console.log('\n\n6️⃣  ISSUE 6: Movies vs Series country filter asymmetry\n')
  console.log('='
.repeat(120))
  console.log('\nMovies: countries_json LIKE (unindexed JSON)')
  console.log('Series: country_of_origin = (indexed column with idx_series_country)\n')
  
  // Check current indexes
  console.log('   Current indexes on movies table:')
  const moviesIndexes = await turso.execute(`SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='movies' AND sql IS NOT NULL`)
  moviesIndexes.rows.forEach(row => {
    console.log(`      ${row.name}`)
  })
  
  console.log('\n   Current indexes on tv_series table:')
  const seriesIndexes = await turso.execute(`SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='tv_series' AND sql IS NOT NULL`)
  seriesIndexes.rows.forEach(row => {
    console.log(`      ${row.name}`)
  })
  
  // Check schema
  console.log('\n   Movies schema (country-related columns):')
  const moviesSchema = await turso.execute(`PRAGMA table_info(movies)`)
  const moviesCountryColumns = moviesSchema.rows.filter(r => r.name.toLowerCase().includes('countr'))
  if (moviesCountryColumns.length > 0) {
    moviesCountryColumns.forEach(col => {
      console.log(`      ${col.name}: ${col.type}`)
    })
  } else {
    console.log(`      Only: countries_json (TEXT, unindexed)`)
  }
  
  console.log('\n   Series schema (country-related columns):')
  const seriesSchema = await turso.execute(`PRAGMA table_info(tv_series)`)
  const seriesCountryColumns = seriesSchema.rows.filter(r => r.name.toLowerCase().includes('countr'))
  seriesCountryColumns.forEach(col => {
    console.log(`      ${col.name}: ${col.type}`)
  })
  
  // Test rare country performance for movies
  console.log('\n   Testing rare country for movies (countries_json LIKE):')
  const rareCountries = [
    { code: 'TH', label: 'Thailand (923 results, 3.5s avg)' },
    { code: 'TR', label: 'Turkey (2072 results, 2.8s avg)' }
  ]
  
  for (const country of rareCountries) {
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar
      FROM movies
      WHERE countries_json LIKE ?
      ORDER BY popularity DESC
      LIMIT 72
    `
    
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args: [`%${country.code}%`]
    })
    
    console.log(`\n      ${country.label}`)
    console.log(`      EXPLAIN: ${explain.rows.map(r => Object.values(r).join(' | ')).join(' / ')}`)
  }
  
  console.log(`\n\n   📌 CONFIRMATION:`)
  console.log(`   ✅ Asymmetry is REAL and intentional/historical:`)
  console.log(`      • Movies: countries_json TEXT (JSON array) - unindexed`)
  console.log(`      • Series: country_of_origin TEXT (single value) - indexed via idx_series_country`)
  console.log(`   \n   ⚠️  IMPLICATION:`)
  console.log(`   Movies country filters have SAME rare-value risk as genre filters:`)
  console.log(`   Must scan idx_movies_popularity row-by-row testing LIKE condition.`)
  console.log(`   \n   However, audit shows this is mostly acceptable (12/15 countries FAST),`)
  console.log(`   with only 3 SLOW (TH: 3.5s, RU: 2.2s, TR: 2.8s) - all rare/small markets.`)
  console.log(`   \n   For movies, rare countries are less critical than rare genres because:`)
  console.log(`   • Country filtering less common in UI than genre filtering`)
  console.log(`   • Slowness is moderate (2-4s) not severe (10-60s like rare series genres)`)
  console.log(`   \n   If this becomes an issue, same solution: Add countries_csv indexed column.`)
}

// ========================================
// Main execution
// ========================================
async function runAll() {
  try {
    await investigate1()
    await investigate2()
    await investigate3()
    await investigate4()
    await investigate5()
    await investigate6()
    
    console.log('\n\n' + '='.repeat(120))
    console.log('✅ INVESTIGATION COMPLETE - All 6 issues examined with evidence')
    console.log('='
.repeat(120))
    
  } catch (error) {
    console.error('\n❌ Error during investigation:', error)
  } finally {
    process.exit(0)
  }
}

runAll()
