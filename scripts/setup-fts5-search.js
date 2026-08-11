#!/usr/bin/env node
/**
 * Setup FTS5 Full-Text Search for 4CIMA
 * 
 * This script creates FTS5 virtual tables for fast text search
 * and migrates existing data from movies and tv_series tables.
 */

import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function setupFTS5() {
  console.log('🔍 Setting up FTS5 Full-Text Search...\n')

  try {
    // Step 1: Test if FTS5 is available
    console.log('1️⃣ Testing FTS5 availability...')
    try {
      await turso.execute('SELECT fts5(?)', ['test'])
      console.log('   ✅ FTS5 is available\n')
    } catch (e) {
      console.error('   ❌ FTS5 not available in this Turso instance')
      console.error('   Error:', e.message)
      process.exit(1)
    }

    // Step 2: Create FTS5 table for movies
    console.log('2️⃣ Creating movies_fts virtual table...')
    await turso.execute(`
      DROP TABLE IF EXISTS movies_fts
    `)
    
    await turso.execute(`
      CREATE VIRTUAL TABLE movies_fts USING fts5(
        title_ar,
        title_en,
        content='movies',
        content_rowid='id',
        tokenize='trigram'
      )
    `)
    console.log('   ✅ movies_fts created\n')

    // Step 3: Populate movies_fts
    console.log('3️⃣ Populating movies_fts with existing data...')
    const moviesCount = await turso.execute(`
      INSERT INTO movies_fts(rowid, title_ar, title_en)
      SELECT id, title_ar, title_en 
      FROM movies
      WHERE title_ar IS NOT NULL OR title_en IS NOT NULL
    `)
    console.log(`   ✅ Indexed ${moviesCount.rowsAffected || 'all'} movies\n`)

    // Step 4: Create FTS5 table for tv_series
    console.log('4️⃣ Creating series_fts virtual table...')
    await turso.execute(`
      DROP TABLE IF EXISTS series_fts
    `)
    
    await turso.execute(`
      CREATE VIRTUAL TABLE series_fts USING fts5(
        name_ar,
        name_en,
        content='tv_series',
        content_rowid='id',
        tokenize='trigram'
      )
    `)
    console.log('   ✅ series_fts created\n')

    // Step 5: Populate series_fts
    console.log('5️⃣ Populating series_fts with existing data...')
    const seriesCount = await turso.execute(`
      INSERT INTO series_fts(rowid, name_ar, name_en)
      SELECT id, name_ar, name_en 
      FROM tv_series
      WHERE name_ar IS NOT NULL OR name_en IS NOT NULL
    `)
    console.log(`   ✅ Indexed ${seriesCount.rowsAffected || 'all'} series\n`)

    // Step 6: Create triggers to keep FTS5 in sync
    console.log('6️⃣ Creating triggers for automatic sync...')
    
    // Movies triggers
    await turso.execute(`
      DROP TRIGGER IF EXISTS movies_fts_insert
    `)
    await turso.execute(`
      CREATE TRIGGER movies_fts_insert AFTER INSERT ON movies BEGIN
        INSERT INTO movies_fts(rowid, title_ar, title_en)
        VALUES (new.id, new.title_ar, new.title_en);
      END
    `)
    
    await turso.execute(`
      DROP TRIGGER IF EXISTS movies_fts_update
    `)
    await turso.execute(`
      CREATE TRIGGER movies_fts_update AFTER UPDATE ON movies BEGIN
        UPDATE movies_fts 
        SET title_ar = new.title_ar, title_en = new.title_en
        WHERE rowid = new.id;
      END
    `)
    
    await turso.execute(`
      DROP TRIGGER IF EXISTS movies_fts_delete
    `)
    await turso.execute(`
      CREATE TRIGGER movies_fts_delete AFTER DELETE ON movies BEGIN
        DELETE FROM movies_fts WHERE rowid = old.id;
      END
    `)

    // Series triggers
    await turso.execute(`
      DROP TRIGGER IF EXISTS series_fts_insert
    `)
    await turso.execute(`
      CREATE TRIGGER series_fts_insert AFTER INSERT ON tv_series BEGIN
        INSERT INTO series_fts(rowid, name_ar, name_en)
        VALUES (new.id, new.name_ar, new.name_en);
      END
    `)
    
    await turso.execute(`
      DROP TRIGGER IF EXISTS series_fts_update
    `)
    await turso.execute(`
      CREATE TRIGGER series_fts_update AFTER UPDATE ON tv_series BEGIN
        UPDATE series_fts 
        SET name_ar = new.name_ar, name_en = new.name_en
        WHERE rowid = new.id;
      END
    `)
    
    await turso.execute(`
      DROP TRIGGER IF EXISTS series_fts_delete
    `)
    await turso.execute(`
      CREATE TRIGGER series_fts_delete AFTER DELETE ON tv_series BEGIN
        DELETE FROM series_fts WHERE rowid = old.id;
      END
    `)
    
    console.log('   ✅ Triggers created\n')

    // Step 7: Test the search
    console.log('7️⃣ Testing FTS5 search...')
    const testResult = await turso.execute({
      sql: `
        SELECT movies.*, 'movie' as media_type
        FROM movies
        JOIN movies_fts ON movies.id = movies_fts.rowid
        WHERE movies_fts MATCH ?
        ORDER BY rank
        LIMIT 5
      `,
      args: ['spider']
    })
    console.log(`   ✅ Test search returned ${testResult.rows.length} results\n`)

    console.log('✅ FTS5 setup completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   • movies_fts: Created and populated`)
    console.log(`   • series_fts: Created and populated`)
    console.log(`   • Auto-sync triggers: Installed`)
    console.log(`   • Search performance: Expected 100x improvement`)
    console.log(`   • Reads per search: Should drop from ~50K-100K to <500\n`)

  } catch (error) {
    console.error('\n❌ Error during FTS5 setup:', error)
    throw error
  }
}

setupFTS5()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
