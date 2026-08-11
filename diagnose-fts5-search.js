#!/usr/bin/env node
/**
 * Diagnose why FTS5 search returns no results
 */

import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function diagnose() {
  try {
    console.log('🔍 Diagnosing FTS5 search issue...\n')

    // 1. Check if movies_fts has data
    console.log('1️⃣ Checking movies_fts content...')
    const ftsContent = await turso.execute(`
      SELECT rowid, title_ar, title_en
      FROM movies_fts
      LIMIT 5
    `)
    console.log('First 5 rows in movies_fts:')
    console.log(JSON.stringify(ftsContent.rows, null, 2))

    // 2. Check if there are movies with 'spider' in title
    console.log('\n2️⃣ Looking for movies with "spider" in title...')
    const moviesWithSpider = await turso.execute(`
      SELECT id, title_en, title_ar
      FROM movies
      WHERE title_en LIKE '%spider%' OR title_en LIKE '%Spider%'
      LIMIT 5
    `)
    console.log('Movies with "spider" in title:')
    console.log(JSON.stringify(moviesWithSpider.rows, null, 2))

    // 3. Test FTS5 MATCH with different patterns
    console.log('\n3️⃣ Testing different FTS5 MATCH patterns...')
    
    const tests = [
      'spider',
      'Spider',
      'SPIDER',
      '"spider"',
      'spider*',
      'spi*',
    ]

    for (const term of tests) {
      try {
        const result = await turso.execute({
          sql: `SELECT COUNT(*) as count FROM movies_fts WHERE movies_fts MATCH ?`,
          args: [term]
        })
        console.log(`   "${term}": ${result.rows[0].count} matches`)
      } catch (e) {
        console.log(`   "${term}": ERROR - ${e.message}`)
      }
    }

    // 4. Try searching for a common Arabic word
    console.log('\n4️⃣ Testing Arabic search...')
    const arabicTests = ['الرجل', 'فيلم', 'حرب']
    
    for (const term of arabicTests) {
      try {
        const result = await turso.execute({
          sql: `SELECT COUNT(*) as count FROM movies_fts WHERE movies_fts MATCH ?`,
          args: [term]
        })
        console.log(`   "${term}": ${result.rows[0].count} matches`)
      } catch (e) {
        console.log(`   "${term}": ERROR - ${e.message}`)
      }
    }

    // 5. Check series_fts
    console.log('\n5️⃣ Checking series_fts...')
    const seriesFtsCheck = await turso.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='series_fts'
    `)
    console.log('series_fts exists:', seriesFtsCheck.rows.length > 0)
    
    if (seriesFtsCheck.rows.length > 0) {
      const seriesCount = await turso.execute(`SELECT COUNT(*) as count FROM series_fts`)
      console.log('series_fts row count:', seriesCount.rows[0].count)
    }

    // 6. Run EXPLAIN QUERY PLAN on the search query
    console.log('\n6️⃣ Analyzing query plan...')
    const explainResult = await turso.execute({
      sql: `
        EXPLAIN QUERY PLAN
        SELECT movies.id, movies.title_en
        FROM movies
        JOIN movies_fts ON movies.id = movies_fts.rowid
        WHERE movies_fts MATCH ?
        ORDER BY rank
        LIMIT 3
      `,
      args: ['spider']
    })
    console.log('Query plan:')
    console.log(JSON.stringify(explainResult.rows, null, 2))

  } catch (error) {
    console.error('Error:', error)
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
