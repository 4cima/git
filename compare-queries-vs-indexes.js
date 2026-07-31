/**
 * Compare actual query WHERE/ORDER BY with partial index definitions
 * To find exact matches and mismatches
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function compareQueriesAndIndexes() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  مقارنة الـ Queries مع الـ Partial Indexes')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Get all partial indexes
  const moviesIndexes = await turso.execute({
    sql: `SELECT name, sql FROM sqlite_master 
          WHERE type='index' 
          AND tbl_name='movies' 
          AND name LIKE '%partial%'
          AND name NOT LIKE 'sqlite_%'`,
    args: []
  })

  const seriesIndexes = await turso.execute({
    sql: `SELECT name, sql FROM sqlite_master 
          WHERE type='index' 
          AND tbl_name='tv_series' 
          AND name LIKE '%partial%'
          AND name NOT LIKE 'sqlite_%'`,
    args: []
  })

  console.log('═══════════════════════════════════════════════════════════════════════════════')
  console.log('MOVIES PARTIAL INDEXES:')
  console.log('═══════════════════════════════════════════════════════════════════════════════\n')
  moviesIndexes.rows.forEach(row => {
    console.log(`${row.name}:`)
    console.log(row.sql)
    console.log('\n' + '─'.repeat(79) + '\n')
  })

  console.log('═══════════════════════════════════════════════════════════════════════════════')
  console.log('TV_SERIES PARTIAL INDEXES:')
  console.log('═══════════════════════════════════════════════════════════════════════════════\n')
  seriesIndexes.rows.forEach(row => {
    console.log(`${row.name}:`)
    console.log(row.sql)
    console.log('\n' + '─'.repeat(79) + '\n')
  })

  console.log('═══════════════════════════════════════════════════════════════════════════════')
  console.log('ACTUAL QUERIES FROM route.ts:')
  console.log('═══════════════════════════════════════════════════════════════════════════════\n')

  const queries = [
    {
      name: 'Query 1: trendingMovies (0.55s after fix)',
      sql: `SELECT ... FROM movies 
WHERE poster_path IS NOT NULL 
  AND backdrop_path IS NOT NULL 
  AND vote_average > 0
ORDER BY popularity DESC`,
      targetIndex: 'idx_movies_pop_partial2',
      originalTime: '63.8s',
      fixedTime: '0.55s'
    },
    {
      name: 'Query 2: trendingSeries',
      sql: `SELECT ... FROM tv_series 
WHERE poster_path IS NOT NULL 
  AND backdrop_path IS NOT NULL 
  AND vote_average > 0
ORDER BY popularity DESC`,
      targetIndex: 'idx_series_pop_partial (or idx_series_backdrop_poster?)',
      originalTime: '20.2s',
      fixedTime: '?'
    },
    {
      name: 'Query 3: latest (الأبطأ)',
      sql: `SELECT ... FROM movies 
WHERE poster_path IS NOT NULL
ORDER BY release_year DESC, popularity DESC`,
      targetIndex: 'idx_movies_year_partial',
      originalTime: '187.6s',
      fixedTime: '?'
    },
    {
      name: 'Query 4: topRated',
      sql: `SELECT ... FROM movies 
WHERE poster_path IS NOT NULL 
  AND vote_average >= 7.5
ORDER BY vote_average DESC`,
      targetIndex: 'idx_movies_rating_partial',
      originalTime: '105.4s',
      fixedTime: '?'
    },
    {
      name: 'Query 5: series',
      sql: `SELECT ... FROM tv_series 
WHERE poster_path IS NOT NULL
ORDER BY popularity DESC`,
      targetIndex: 'idx_series_poster_popularity (or idx_series_pop_partial?)',
      originalTime: '41.3s',
      fixedTime: '?'
    }
  ]

  queries.forEach((q, i) => {
    console.log(`${i + 1}. ${q.name}`)
    console.log(`   Target Index: ${q.targetIndex}`)
    console.log(`   Original: ${q.originalTime} → Fixed: ${q.fixedTime}`)
    console.log('\n   Query SQL:')
    console.log('   ' + q.sql.split('\n').join('\n   '))
    console.log('\n' + '─'.repeat(79) + '\n')
  })

  console.log('═══════════════════════════════════════════════════════════════════════════════')
  console.log('ANALYSIS:')
  console.log('═══════════════════════════════════════════════════════════════════════════════\n')
  
  console.log('✅ Query 1 (trendingMovies):')
  console.log('   WHERE: poster_path IS NOT NULL AND backdrop_path IS NOT NULL AND vote_average > 0')
  console.log('   Index WHERE: poster_path IS NOT NULL AND backdrop_path IS NOT NULL AND vote_average > 0')
  console.log('   ✅ EXACT MATCH! → 0.55s (success)')
  console.log()

  console.log('❓ Query 2 (trendingSeries):')
  console.log('   WHERE: poster_path IS NOT NULL AND backdrop_path IS NOT NULL AND vote_average > 0')
  console.log('   Available: idx_series_pop_partial, idx_series_backdrop_poster')
  console.log('   Need to check which one matches!')
  console.log()

  console.log('❓ Query 3 (latest):')
  console.log('   WHERE: poster_path IS NOT NULL')
  console.log('   Index WHERE: poster_path IS NOT NULL AND (filter_status IS NULL OR filter_status IN (...))')
  console.log('   ⚠️  Index has EXTRA condition! May not match.')
  console.log()

  console.log('❓ Query 4 (topRated):')
  console.log('   WHERE: poster_path IS NOT NULL AND vote_average >= 7.5')
  console.log('   Index WHERE: poster_path IS NOT NULL AND vote_average >= 7.5 AND (filter_status IS NULL OR ...)')
  console.log('   ⚠️  Index has EXTRA condition! May not match.')
  console.log()

  console.log('❓ Query 5 (series):')
  console.log('   WHERE: poster_path IS NOT NULL')
  console.log('   Need to check available partial indexes for tv_series')
  console.log()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  turso.close()
}

compareQueriesAndIndexes().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
