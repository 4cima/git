#!/usr/bin/env node
/**
 * TURSO ROWS-READ DIAGNOSTIC
 * Goal: Identify which queries/routes are responsible for 1.6B+ rows-read
 * 
 * This script performs a query-level audit by running EXPLAIN QUERY PLAN
 * on all production API routes to identify SCAN vs SEARCH patterns.
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client'

// Load .env.local explicitly
config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

console.log('Connected to:', process.env.TURSO_DATABASE_URL ? 'Turso ✅' : '❌ No URL')

console.log('🔍 TURSO ROWS-READ DIAGNOSTIC\n')
console.log('=' .repeat(80))

// Helper to run EXPLAIN QUERY PLAN and analyze
async function explainQuery(label, sql, args = []) {
  try {
    const result = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    
    const plan = result.rows.map(r => r.detail).join('\n')
    const hasScan = plan.includes('SCAN')
    const hasSearch = plan.includes('SEARCH')
    const usesIndex = plan.includes('USING INDEX') || plan.includes('USING COVERING INDEX')
    
    console.log(`\n${label}`)
    console.log('-'.repeat(80))
    console.log(plan)
    
    if (hasScan && !usesIndex) {
      console.log('⚠️  WARNING: FULL TABLE SCAN detected!')
    } else if (hasSearch && usesIndex) {
      console.log('✅ Uses index')
    }
    
    return { hasScan, hasSearch, usesIndex, plan }
  } catch (error) {
    console.error(`❌ Error explaining ${label}:`, error.message)
    return null
  }
}

// Get actual row counts to understand scale
async function getTableCounts() {
  console.log('\n📊 TABLE ROW COUNTS')
  console.log('=' .repeat(80))
  
  const tables = ['movies', 'tv_series', 'movies_fts', 'series_fts', 'short_titles_lookup', 'genres', 'genre_counts']
  
  for (const table of tables) {
    try {
      const result = await turso.execute(`SELECT COUNT(*) as count FROM ${table}`)
      const count = result.rows[0].count
      console.log(`${table.padEnd(25)}: ${Number(count).toLocaleString()}`)
    } catch (error) {
      console.log(`${table.padEnd(25)}: ❌ ${error.message}`)
    }
  }
}

// Audit all API route queries
async function auditQueries() {
  console.log('\n\n🔍 QUERY AUDIT (EXPLAIN QUERY PLAN)')
  console.log('=' .repeat(80))
  
  // /api/home - static cached
  await explainQuery(
    '1. /api/home - Popular movies',
    'SELECT * FROM movies WHERE (filter_status IN (?, ?) OR filter_status IS NULL) ORDER BY popularity DESC LIMIT ?',
    ['clean', 'reviewed_approved', 100]
  )
  
  await explainQuery(
    '2. /api/home - Popular series',
    'SELECT * FROM tv_series WHERE (filter_status IN (?, ?) OR filter_status IS NULL) ORDER BY popularity DESC LIMIT ?',
    ['clean', 'reviewed_approved', 100]
  )
  
  // /api/movies - dynamic with filters
  await explainQuery(
    '3. /api/movies - No filters',
    'SELECT * FROM movies WHERE (filter_status IN (?, ?) OR filter_status IS NULL) ORDER BY popularity DESC LIMIT ? OFFSET ?',
    ['clean', 'reviewed_approved', 24, 0]
  )
  
  await explainQuery(
    '4. /api/movies - With genre filter',
    'SELECT * FROM movies WHERE (filter_status IN (?, ?) OR filter_status IS NULL) AND genres_json LIKE ? ORDER BY popularity DESC LIMIT ? OFFSET ?',
    ['clean', 'reviewed_approved', '%"slug":"action"%', 24, 0]
  )
  
  await explainQuery(
    '5. /api/movies - With year range',
    'SELECT * FROM movies WHERE (filter_status IN (?, ?) OR filter_status IS NULL) AND release_year BETWEEN ? AND ? ORDER BY popularity DESC LIMIT ? OFFSET ?',
    ['clean', 'reviewed_approved', 2020, 2024, 24, 0]
  )
  
  await explainQuery(
    '6. /api/movies - With rating range',
    'SELECT * FROM movies WHERE (filter_status IN (?, ?) OR filter_status IS NULL) AND vote_average BETWEEN ? AND ? ORDER BY popularity DESC LIMIT ? OFFSET ?',
    ['clean', 'reviewed_approved', 7.0, 8.0, 24, 0]
  )
  
  await explainQuery(
    '7. /api/movies - With FTS5 search',
    'SELECT m.* FROM movies m JOIN movies_fts ON m.id = movies_fts.rowid WHERE (filter_status IN (?, ?) OR filter_status IS NULL) AND movies_fts MATCH ? ORDER BY rank, popularity DESC LIMIT ? OFFSET ?',
    ['clean', 'reviewed_approved', 'batman', 24, 0]
  )
  
  // /api/series - dynamic with filters
  await explainQuery(
    '8. /api/series - No filters',
    'SELECT * FROM tv_series WHERE (filter_status IN (?, ?) OR filter_status IS NULL) ORDER BY popularity DESC LIMIT ? OFFSET ?',
    ['clean', 'reviewed_approved', 24, 0]
  )
  
  await explainQuery(
    '9. /api/series - With genre filter',
    'SELECT * FROM tv_series WHERE (filter_status IN (?, ?) OR filter_status IS NULL) AND genres_json LIKE ? ORDER BY popularity DESC LIMIT ? OFFSET ?',
    ['clean', 'reviewed_approved', '%"slug":"action"%', 24, 0]
  )
  
  // /api/search - MOST CRITICAL
  await explainQuery(
    '10. /api/search - 3+ chars (FTS5)',
    'SELECT m.id, m.slug, m.title_ar, m.title_en, m.poster_path, m.vote_average, m.release_year, \'movie\' as media_type FROM movies m JOIN movies_fts ON m.id = movies_fts.rowid WHERE movies_fts MATCH ? ORDER BY rank LIMIT ?',
    ['spider man', 10]
  )
  
  await explainQuery(
    '11. /api/search - 2 chars (prefix)',
    'SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year, \'movie\' as media_type FROM movies WHERE title_en LIKE ? OR title_ar LIKE ? LIMIT ?',
    ['sp%', 'sp%', 10]
  )
  
  await explainQuery(
    '12. /api/search - 1 char (short_titles_lookup)',
    'SELECT m.id, m.slug, m.title_ar, m.title_en, m.poster_path, m.vote_average, m.release_year, \'movie\' as media_type FROM short_titles_lookup stl JOIN movies m ON stl.content_id = m.id WHERE stl.short_title = ? AND stl.media_type = ? LIMIT ?',
    ['s', 'movie', 10]
  )
  
  // /api/tv - has COUNT(*) query!
  await explainQuery(
    '13. /api/tv - COUNT(*) for pagination',
    'SELECT COUNT(*) as total FROM tv_series WHERE (filter_status IN (?, ?) OR filter_status IS NULL)',
    ['clean', 'reviewed_approved']
  )
  
  // /api/genres/[slug] - type='all' fetches EVERYTHING
  await explainQuery(
    '14. /api/genres/[slug] - Fetch ALL movies for genre',
    'SELECT m.*, ? as media_type FROM movies m WHERE genres_json LIKE ?',
    ['movie', '%"name_ar":"أكشن"%']
  )
  
  await explainQuery(
    '15. /api/genres/[slug] - Fetch ALL series for genre',
    'SELECT s.*, ? as media_type FROM tv_series s WHERE genres_json LIKE ?',
    ['tv', '%"name_ar":"أكشن"%']
  )
  
  // Detail pages
  await explainQuery(
    '16. /api/movies/[slug] - Single movie by slug',
    'SELECT * FROM movies WHERE slug = ? AND (filter_status IN (?, ?) OR filter_status IS NULL) LIMIT ?',
    ['the-dark-knight', 'clean', 'reviewed_approved', 1]
  )
  
  await explainQuery(
    '17. /api/series/[slug] - Single series by slug',
    'SELECT * FROM tv_series WHERE slug = ? LIMIT ?',
    ['breaking-bad', 1]
  )
  
  await explainQuery(
    '18. /api/series/[slug] - Fetch all seasons',
    'SELECT * FROM tv_seasons WHERE tv_series_id = ? ORDER BY season_number ASC',
    [1396]
  )
}

// Check for missing indexes
async function checkIndexes() {
  console.log('\n\n🔍 INDEX AUDIT')
  console.log('=' .repeat(80))
  
  try {
    // Movies indexes
    const moviesIndexes = await turso.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='movies'")
    console.log('\n📊 MOVIES INDEXES:')
    moviesIndexes.rows.forEach(idx => {
      console.log(`  - ${idx.name}`)
      if (idx.sql) console.log(`    ${idx.sql}`)
    })
    
    // Series indexes
    const seriesIndexes = await turso.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='tv_series'")
    console.log('\n📊 TV_SERIES INDEXES:')
    seriesIndexes.rows.forEach(idx => {
      console.log(`  - ${idx.name}`)
      if (idx.sql) console.log(`    ${idx.sql}`)
    })
    
    // Check for common missing indexes
    console.log('\n⚠️  LIKELY MISSING INDEXES:')
    console.log('  - genres_json columns (currently use LIKE which can\'t use indexes efficiently)')
    console.log('  - Composite indexes for common filter combinations')
    
  } catch (error) {
    console.error('❌ Error checking indexes:', error.message)
  }
}

// Main execution
async function main() {
  try {
    await getTableCounts()
    await auditQueries()
    await checkIndexes()
    
    console.log('\n\n' + '='.repeat(80))
    console.log('🎯 KEY FINDINGS TO INVESTIGATE:')
    console.log('='.repeat(80))
    console.log('1. /api/tv route uses COUNT(*) - scans entire tv_series table on EVERY request')
    console.log('2. /api/genres/[slug] with type="all" fetches ENTIRE genre (no LIMIT) - can be 10k+ rows')
    console.log('3. genres_json LIKE queries can\'t use indexes efficiently')
    console.log('4. /api/search with 2-char queries uses LIKE which may scan without proper index')
    console.log('5. No server-side caching - every request hits Turso directly')
    console.log('\n🔍 NEXT STEPS:')
    console.log('  - Access Turso dashboard Analytics to see actual query frequency')
    console.log('  - Check Koyeb/Cloudflare logs for traffic patterns')
    console.log('  - Investigate ww1.4cima.com domain')
    console.log('  - Check for any background scripts looping')
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  } finally {
    process.exit(0)
  }
}

main()
