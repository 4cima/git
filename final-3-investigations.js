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

console.log('🔬 FINAL 3 INVESTIGATIONS BEFORE INDEX APPROVAL\n')
console.log('='.repeat(100))

// ============================================
// ITEM 1: Movies "family" genre - rare or common?
// ============================================
async function investigate1() {
  console.log('\n1️⃣  Movies "family" genre - rare genre or connection variance?\n')
  
  console.log('Running 5 API calls to test consistency:\n')
  
  const timings = []
  for (let i = 1; i <= 5; i++) {
    try {
      const start = Date.now()
      execSync('curl -s "http://localhost:3000/api/movies?genre=family&page=1&limit=72&sort=popularity&order=desc" -o nul --max-time 120', {
        encoding: 'utf-8',
        timeout: 125000,
        stdio: 'pipe'
      })
      const duration = Date.now() - start
      timings.push(duration)
      console.log(`   Run ${i}: ${duration}ms`)
    } catch (e) {
      const duration = Date.now() - start
      timings.push(duration)
      console.log(`   Run ${i}: ${duration}ms (timeout/error)`)
    }
    
    // 2 second pause between runs
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  const avg = timings.reduce((a,b) => a+b, 0) / timings.length
  const min = Math.min(...timings)
  const max = Math.max(...timings)
  const variance = max / min
  
  console.log(`\n   Timings: [${timings.join(', ')}]`)
  console.log(`   Average: ${avg.toFixed(0)}ms`)
  console.log(`   Range: ${min}ms - ${max}ms`)
  console.log(`   Variance: ${variance.toFixed(1)}x`)
  
  // Get actual result count with aggressive timeout
  console.log(`\n   Attempting to get result count (with 15s timeout)...`)
  
  try {
    const countResult = await Promise.race([
      turso.execute({
        sql: `SELECT COUNT(*) as count FROM movies WHERE genres_json LIKE ?`,
        args: ['%"slug":"family"%']
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
    ])
    
    const familyCount = countResult.rows[0].count
    const totalMovies = 239376 // From earlier query
    const percentage = ((familyCount / totalMovies) * 100).toFixed(2)
    
    console.log(`   ✅ Result count: ${familyCount} movies (${percentage}% of total)`)
    
    // Compare to reference genres
    console.log(`\n   Comparison to other genres:`)
    
    const refGenres = [
      { slug: 'drama', label: 'drama (common)', expected: '96k (40%)' },
      { slug: 'comedy', label: 'comedy (common)', expected: '60k (25%)' },
      { slug: 'romance', label: 'romance (medium)', expected: '26k (11%)' },
      { slug: 'horror', label: 'horror (medium)', expected: '14k (6%)' },
      { slug: 'war', label: 'war (rare)', expected: '6k (3%)' }
    ]
    
    for (const ref of refGenres) {
      try {
        const refResult = await Promise.race([
          turso.execute({
            sql: `SELECT COUNT(*) as count FROM movies WHERE genres_json LIKE ?`,
            args: [`%"slug":"${ref.slug}"%`]
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ])
        const refCount = refResult.rows[0].count
        const refPct = ((refCount / totalMovies) * 100).toFixed(2)
        console.log(`      ${ref.label}: ${refCount} (${refPct}%)`)
      } catch (e) {
        console.log(`      ${ref.label}: ${ref.expected} (estimated)`)
      }
    }
    
    console.log(`\n   📊 FREQUENCY CLASSIFICATION:`)
    if (percentage > 20) {
      console.log(`   ✅ "family" is COMMON (${percentage}%) - comparable to comedy/drama`)
      console.log(`   📌 CONCLUSION: ${avg.toFixed(0)}ms average timing does NOT match rare-genre pattern`)
      console.log(`      Rare genres (history 0.03%, romance 0.24%) take 10-60s consistently`)
      console.log(`      This ${variance.toFixed(1)}x variance (${min}-${max}ms) suggests CONNECTION VARIANCE, not structural slowness`)
    } else if (percentage > 5) {
      console.log(`   ⚠️  "family" is MEDIUM (${percentage}%) - similar to horror/thriller`)
      console.log(`   📌 Timing variance suggests mixed: some structural slowness + connection variance`)
    } else {
      console.log(`   ❌ "family" is RARE (${percentage}%) - comparable to war/western`)
      console.log(`   📌 CONCLUSION: Slow timing matches rare-genre math`)
      console.log(`      Expected to scan ~${Math.floor(totalMovies / familyCount * 72)} rows to find 72 matches`)
    }
    
  } catch (e) {
    console.log(`   ❌ COUNT query timed out (15s) - cannot determine frequency`)
    console.log(`   📌 INCONCLUSIVE: But ${variance.toFixed(1)}x API timing variance suggests connection issue`)
  }
}

// ============================================
// ITEM 2: Zero-result series genres - UX fix
// ============================================
async function investigate2() {
  console.log('\n\n2️⃣  Zero-result series genres - urgent UX fix\n')
  console.log('='.repeat(100))
  
  const zeroGenres = [
    { slug: 'action-adventure', arabic: 'أكشن ومغامرة' },
    { slug: 'sci-fi-fantasy', arabic: 'خيال علمي وفانتازيا' },
    { slug: 'war-politics', arabic: 'حرب وسياسة' }
  ]
  
  console.log('a) Sampling actual tv_series.genres_json to find real stored slugs:\n')
  
  // Get sample of actual genres_json to see format
  const sampleResult = await turso.execute({
    sql: `SELECT genres_json FROM tv_series WHERE genres_json IS NOT NULL AND genres_json != '[]' LIMIT 20`,
    args: []
  })
  
  console.log('   Sample genres_json from database (first 5):')
  sampleResult.rows.slice(0, 5).forEach((row, i) => {
    console.log(`   ${i+1}. ${row.genres_json}`)
  })
  
  // Parse and collect all unique slugs
  const allSlugs = new Set()
  sampleResult.rows.forEach(row => {
    try {
      const genres = JSON.parse(row.genres_json)
      genres.forEach(g => {
        if (g.slug) allSlugs.add(g.slug)
      })
    } catch (e) {
      // Invalid JSON, skip
    }
  })
  
  console.log(`\n   All unique genre slugs found in sample (${allSlugs.size} unique):`)
  const sortedSlugs = Array.from(allSlugs).sort()
  sortedSlugs.forEach(slug => console.log(`      - ${slug}`))
  
  console.log(`\n   Checking for similar patterns to zero-result genres:\n`)
  
  const alternativePatterns = {
    'action-adventure': ['action', 'adventure', 'action_adventure', 'actionadventure', 'action & adventure'],
    'sci-fi-fantasy': ['sci-fi', 'fantasy', 'scifi', 'science-fiction', 'sci-fi_fantasy', 'sci-fi & fantasy'],
    'war-politics': ['war', 'politics', 'war_politics', 'warpolitics', 'war & politics']
  }
  
  for (const [missingSlug, alternatives] of Object.entries(alternativePatterns)) {
    console.log(`   ${missingSlug}:`)
    
    for (const alt of alternatives) {
      if (sortedSlugs.includes(alt)) {
        console.log(`      ✅ FOUND IN DATABASE: "${alt}"`)
        
        // Get count for this alternative
        const altCount = await turso.execute({
          sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`,
          args: [`%"slug":"${alt}"%`]
        })
        console.log(`         (${altCount.rows[0].count} series have this genre)`)
      }
    }
    
    // Check if the exact compound slug exists anywhere
    const exactMatch = sortedSlugs.filter(s => s.includes(missingSlug.split('-')[0]) || s.includes(missingSlug.split('-')[1]))
    if (exactMatch.length > 0 && !exactMatch.includes(missingSlug)) {
      console.log(`      📌 Related slugs found: ${exactMatch.join(', ')}`)
    }
  }
  
  console.log(`\n\nb) Proposed fix:\n`)
  
  console.log('   Based on TMDB genre data, these are likely compound genres that map to multiple separate genres:')
  console.log('   • "Action & Adventure" → stored as separate "action" and "adventure" genres')
  console.log('   • "Sci-Fi & Fantasy" → stored as separate "sci-fi" and "fantasy" genres')
  console.log('   • "War & Politics" → stored as separate "war" and "politics" genres\n')
  
  console.log('   OPTION 1: Update UI mapping (FASTEST, SAFEST):')
  console.log('   Change GENRES constant in SeriesPageClient.tsx:')
  console.log('   - Remove: { name: "أكشن ومغامرة", slug: "action-adventure" }')
  console.log('   - Remove: { name: "خيال علمي وفانتازيا", slug: "sci-fi-fantasy" }')
  console.log('   - Remove: { name: "حرب وسياسة", slug: "war-politics" }')
  console.log('   Or keep them but map to the working individual slugs in API\n')
  
  console.log('   OPTION 2: Fix ingestion script (SLOWER, more complex):')
  console.log('   Update scripts/1-fetch-and-enrich.js to handle TMDB compound genres')
  console.log('   Map TMDB "Action & Adventure" (ID 10759) → stored as "action-adventure"')
  console.log('   Requires re-ingesting all series\n')
  
  console.log('   📌 RECOMMENDATION: OPTION 1 (remove from UI)')
  console.log('   • Immediate fix (5 min)')
  console.log('   • No data changes needed')
  console.log('   • No re-ingestion required')
  console.log('   • Users can still find content via individual genres\n')
  
  console.log('   ⚠️  IMPACT: 3 filter options removed from UI')
  console.log('   ✅ BENEFIT: Stops 60s wait → empty grid UX disaster')
}

// ============================================
// ITEM 3: Scope confirmation before approval
// ============================================
async function investigate3() {
  console.log('\n\n3️⃣  Scope confirmation: What gets fixed vs what stays broken\n')
  console.log('='.repeat(100))
  
  console.log('\n📊 CRITICAL ISSUES (14 total) - Breakdown:\n')
  
  const critical = [
    { test: 'Movies vote_average sort', timing: '39s', fixed: 'YES - idx_movies_vote_average_desc' },
    { test: 'Movies vote_count sort', timing: '29s', fixed: 'YES - idx_movies_vote_count_desc' },
    { test: 'Movies 2000s decade filter', timing: '10s', fixed: 'YES - idx_movies_year_popularity' },
    { test: 'Series rating 7.1-8', timing: '10s', fixed: 'YES - idx_series_vote_average_popularity' },
    { test: 'Series rating 6.1-7', timing: '11s', fixed: 'YES - idx_series_vote_average_popularity' },
    { test: 'Series genre: action-adventure', timing: '61s', fixed: 'NO - needs genre_ids_csv (also 0 results = UX bug)' },
    { test: 'Series genre: sci-fi-fantasy', timing: '32s', fixed: 'NO - needs genre_ids_csv (also 0 results = UX bug)' },
    { test: 'Series genre: war-politics', timing: '22s', fixed: 'NO - needs genre_ids_csv (also 0 results = UX bug)' },
    { test: 'Series genre: history', timing: '66s', fixed: 'NO - needs genre_ids_csv (16 results, RARE)' },
    { test: 'Series genre: romance', timing: '11s', fixed: 'NO - needs genre_ids_csv (116 results, rare-ish)' },
    { test: 'Movies genre: family', timing: '16s', fixed: 'NO - needs genre_ids_csv OR connection variance (inconclusive)' },
    { test: 'Movies action + 1990s combo', timing: '22s', fixed: 'NO - needs genre_ids_csv (genre LIKE blocks index)' },
    { test: 'Movies drama + KR combo', timing: '58s', fixed: 'NO - needs genre_ids_csv (double LIKE disaster)' },
    { test: 'Movies rating + vote_count combo', timing: '26s', fixed: 'YES - idx_movies_vote_count_desc' },
  ]
  
  const fixed = critical.filter(c => c.fixed.startsWith('YES'))
  const notFixed = critical.filter(c => c.fixed.startsWith('NO'))
  
  console.log('✅ WILL BE FIXED by 6 proposed indexes:\n')
  fixed.forEach(c => {
    console.log(`   • ${c.test}: ${c.timing} → <2s`)
    console.log(`     ${c.fixed}`)
  })
  
  console.log(`\n   Total: ${fixed.length}/14 CRITICAL issues fixed (${((fixed.length/14)*100).toFixed(0)}%)\n`)
  
  console.log('\n❌ WILL REMAIN BROKEN after 6 indexes:\n')
  notFixed.forEach(c => {
    console.log(`   • ${c.test}: ${c.timing}`)
    console.log(`     ${c.fixed}`)
  })
  
  console.log(`\n   Total: ${notFixed.length}/14 CRITICAL issues remain (${((notFixed.length/14)*100).toFixed(0)}%)\n`)
  
  console.log('\n🔴 WORST TWO CASES:\n')
  console.log('   1. Series "history" genre: 66s average')
  console.log('      • 16 results (0.03% of 50k series)')
  console.log('      • Must scan ~3,100 rows to find 72 matches')
  console.log('      • NOT fixable with sort-column indexes')
  console.log('      • ONLY fixable with genre_ids_csv indexed column\n')
  
  console.log('   2. Movies drama + KR combo: 58s average')
  console.log('      • Double LIKE filter (genre JSON + country JSON)')
  console.log('      • Forces FULL TABLE SCAN (no index can help)')
  console.log('      • NOT fixable with sort-column indexes')
  console.log('      • ONLY fixable with genre_ids_csv indexed column\n')
  
  console.log('\n📌 SCOPE CONFIRMATION:\n')
  console.log('   ✅ Approving the 6 proposed indexes will:')
  console.log('      • Fix 5/14 CRITICAL issues (36%)')
  console.log('      • Reduce ~26 SLOW issues (year, country, rating filters)')
  console.log('      • Take 2-4 minutes to create')
  console.log('      • Cost ~869k row writes (one-time)')
  console.log('      • Improve baseline sorts, year filters, country filters, rating filters\n')
  
  console.log('   ❌ The 6 indexes will NOT fix:')
  console.log('      • 9/14 CRITICAL issues (64%)')
  console.log('      • All rare genre filters (history: 66s, romance: 11s)')
  console.log('      • All zero-result genres (action-adventure: 61s, but also UX bug)')
  console.log('      • Genre combination filters (action+1990s: 22s)')
  console.log('      • Double-LIKE disaster (drama+KR: 58s)')
  console.log('      • Movies "family" variance (if structural and not connection issue)\n')
  
  console.log('   🔧 Separate decision needed for genre_ids_csv:')
  console.log('      • Schema change (2 columns)')
  console.log('      • Ingestion script update')
  console.log('      • API query complexity')
  console.log('      • Would fix the 9 remaining CRITICAL issues')
  console.log('      • Evaluate separately after 6 indexes verified\n')
  
  console.log('\n✅ SCOPE SPLIT CONFIRMED:')
  console.log('   This approval = 6 sort-column composite indexes')
  console.log('   Separate decision = genre_ids_csv schema change')
  console.log('   You are approving with full knowledge of what is fixed vs still broken.')
}

// Main
async function run() {
  try {
    await investigate1()
    await investigate2()
    await investigate3()
    
    console.log('\n\n' + '='.repeat(100))
    console.log('✅ ALL 3 INVESTIGATIONS COMPLETE')
    console.log('='.repeat(100))
    console.log('\nReady for your explicit approval to:')
    console.log('1. CREATE 6 indexes (awaiting approval)')
    console.log('2. Fix zero-result genre UX bug (awaiting approval + approach decision)')
    console.log('3. Evaluate genre_ids_csv separately after #1 verified')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

run()
