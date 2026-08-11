#!/usr/bin/env node
/**
 * Diagnose trigram tokenizer issue
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
    console.log('🔍 Diagnosing FTS5 tokenizer issue...\n')

    // 1. Check available tokenizers
    console.log('1️⃣ Testing tokenizer availability...')
    
    const tokenizers = ['unicode61', 'ascii', 'porter', 'trigram']
    
    for (const tok of tokenizers) {
      try {
        await turso.execute(`
          DROP TABLE IF EXISTS test_fts_${tok}
        `)
        await turso.execute(`
          CREATE VIRTUAL TABLE test_fts_${tok} USING fts5(content, tokenize='${tok}')
        `)
        await turso.execute(`INSERT INTO test_fts_${tok}(content) VALUES ('test')`)
        const test = await turso.execute(`SELECT * FROM test_fts_${tok} WHERE test_fts_${tok} MATCH 'test'`)
        await turso.execute(`DROP TABLE test_fts_${tok}`)
        console.log(`   ✅ ${tok}: Available (${test.rows.length} results)`)
      } catch (e) {
        console.log(`   ❌ ${tok}: NOT available - ${e.message}`)
      }
    }

    // 2. Check what tokenizer series_fts is actually using
    console.log('\n2️⃣ Checking series_fts configuration...')
    const config = await turso.execute(`
      SELECT * FROM series_fts_config
    `)
    console.log('   Configuration:', JSON.stringify(config.rows, null, 2))

    // 3. Try direct FTS5 query with trigram
    console.log('\n3️⃣ Testing trigram substring match...')
    try {
      // Trigram should match substrings
      const result = await turso.execute({
        sql: `SELECT COUNT(*) as count FROM series_fts WHERE name_en MATCH ?`,
        args: ['Pri']
      })
      console.log(`   "Pri" matches: ${result.rows[0].count}`)
    } catch (e) {
      console.error(`   Error: ${e.message}`)
    }

    // 4. Test if we need to use column name prefix
    console.log('\n4️⃣ Testing column-prefixed search...')
    const tests = [
      'Pride',
      'name_en:Pride',
      '"Pride"',
      'name_en:"Pride"',
      'pri*',
      'name_en:pri*'
    ]
    
    for (const term of tests) {
      try {
        const result = await turso.execute({
          sql: `SELECT COUNT(*) as count FROM series_fts WHERE series_fts MATCH ?`,
          args: [term]
        })
        console.log(`   "${term}": ${result.rows[0].count} matches`)
      } catch (e) {
        console.log(`   "${term}": ERROR - ${e.message}`)
      }
    }

    // 5. Check movies_fts for comparison
    console.log('\n5️⃣ Comparing with movies_fts (which works)...')
    const moviesConfig = await turso.execute(`
      SELECT * FROM movies_fts_config
    `)
    console.log('   movies_fts configuration:', JSON.stringify(moviesConfig.rows, null, 2))

  } catch (error) {
    console.error('Error:', error)
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
