#!/usr/bin/env node
/**
 * Sync SEO keywords from Local DB to Turso
 * Only updates seo_keywords_json field for existing records
 */

const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const localDb = new Database('./data/4cima-local.db', { readonly: true })

async function syncKeywords() {
  console.log('🔄 Starting SEO keywords sync...\n')

  // Get all series with keywords from local DB
  const seriesWithKeywords = localDb.prepare(`
    SELECT tmdb_id, slug, seo_keywords_json 
    FROM tv_series 
    WHERE seo_keywords_json IS NOT NULL 
    AND seo_keywords_json != ''
    LIMIT 100
  `).all()

  console.log(`📊 Found ${seriesWithKeywords.length} series with keywords in Local DB\n`)

  let updated = 0
  let notFound = 0
  let errors = 0

  for (const series of seriesWithKeywords) {
    try {
      // Update by tmdb_id (more reliable than slug)
      const result = await turso.execute({
        sql: `UPDATE tv_series 
              SET seo_keywords_json = ? 
              WHERE tmdb_id = ?`,
        args: [series.seo_keywords_json, series.tmdb_id]
      })

      if (result.rowsAffected > 0) {
        updated++
        console.log(`✅ Updated tmdb_id=${series.tmdb_id} (${series.slug})`)
      } else {
        notFound++
        console.log(`⚠️  Not found in Turso: tmdb_id=${series.tmdb_id}`)
      }
    } catch (error) {
      errors++
      console.error(`❌ Error updating tmdb_id=${series.tmdb_id}:`, error.message)
    }
  }

  console.log(`\n📈 Summary:`)
  console.log(`  ✅ Updated: ${updated}`)
  console.log(`  ⚠️  Not found: ${notFound}`)
  console.log(`  ❌ Errors: ${errors}`)
}

syncKeywords()
  .then(() => {
    console.log('\n✅ Sync completed!')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Sync failed:', err)
    process.exit(1)
  })
