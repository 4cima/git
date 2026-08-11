#!/usr/bin/env node
/**
 * Add FTS5 auto-sync triggers for movies and series
 * These were missing from the original setup
 */

import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function addTriggers() {
  console.log('🔧 Adding FTS5 auto-sync triggers...\n')

  try {
    // Movies triggers
    console.log('1️⃣ Creating movies_fts triggers...')
    
    await turso.execute(`DROP TRIGGER IF EXISTS movies_fts_insert`)
    await turso.execute(`
      CREATE TRIGGER movies_fts_insert AFTER INSERT ON movies BEGIN
        INSERT INTO movies_fts(rowid, title_ar, title_en)
        VALUES (new.id, new.title_ar, new.title_en);
      END
    `)
    console.log('   ✅ movies_fts_insert')
    
    await turso.execute(`DROP TRIGGER IF EXISTS movies_fts_update`)
    await turso.execute(`
      CREATE TRIGGER movies_fts_update AFTER UPDATE ON movies BEGIN
        UPDATE movies_fts 
        SET title_ar = new.title_ar, title_en = new.title_en
        WHERE rowid = new.id;
      END
    `)
    console.log('   ✅ movies_fts_update')
    
    await turso.execute(`DROP TRIGGER IF EXISTS movies_fts_delete`)
    await turso.execute(`
      CREATE TRIGGER movies_fts_delete AFTER DELETE ON movies BEGIN
        DELETE FROM movies_fts WHERE rowid = old.id;
      END
    `)
    console.log('   ✅ movies_fts_delete')

    // Series triggers
    console.log('\n2️⃣ Creating series_fts triggers...')
    
    await turso.execute(`DROP TRIGGER IF EXISTS series_fts_insert`)
    await turso.execute(`
      CREATE TRIGGER series_fts_insert AFTER INSERT ON tv_series BEGIN
        INSERT INTO series_fts(rowid, name_ar, name_en)
        VALUES (new.id, new.name_ar, new.name_en);
      END
    `)
    console.log('   ✅ series_fts_insert')
    
    await turso.execute(`DROP TRIGGER IF EXISTS series_fts_update`)
    await turso.execute(`
      CREATE TRIGGER series_fts_update AFTER UPDATE ON tv_series BEGIN
        UPDATE series_fts 
        SET name_ar = new.name_ar, name_en = new.name_en
        WHERE rowid = new.id;
      END
    `)
    console.log('   ✅ series_fts_update')
    
    await turso.execute(`DROP TRIGGER IF EXISTS series_fts_delete`)
    await turso.execute(`
      CREATE TRIGGER series_fts_delete AFTER DELETE ON tv_series BEGIN
        DELETE FROM series_fts WHERE rowid = old.id;
      END
    `)
    console.log('   ✅ series_fts_delete')

    console.log('\n✅ All triggers created successfully!')
    console.log('\n📋 Summary:')
    console.log('   • movies_fts: 3 triggers (INSERT, UPDATE, DELETE)')
    console.log('   • series_fts: 3 triggers (INSERT, UPDATE, DELETE)')
    console.log('   • New movies/series will be automatically indexed')

    // Verify triggers exist
    console.log('\n3️⃣ Verifying triggers...')
    const triggers = await turso.execute(`
      SELECT name, tbl_name 
      FROM sqlite_master 
      WHERE type='trigger' AND name LIKE '%fts%'
      ORDER BY name
    `)
    console.log(`   Found ${triggers.rows.length} FTS triggers:`)
    triggers.rows.forEach(t => console.log(`   - ${t.name} (on ${t.tbl_name})`))

  } catch (error) {
    console.error('\n❌ Error:', error)
    throw error
  }
}

addTriggers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
