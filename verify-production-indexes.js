/**
 * Verify that all required indexes exist on the current Turso database
 * Run this before pushing to production
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function verifyIndexes() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  التحقق من الـ Indexes المطلوبة')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log(`📍 Database: ${process.env.TURSO_DATABASE_URL}\n`)

  const requiredIndexes = [
    'idx_movies_pop_partial2',      // Query 1: trendingMovies
    'idx_series_home_trending',     // Query 2: trendingSeries
    'idx_movies_home_latest',       // Query 3: latest
    'idx_movies_home_toprated',     // Query 4: topRated
    'idx_series_home_all'           // Query 5: series
  ]

  let allExist = true

  for (const indexName of requiredIndexes) {
    const result = await turso.execute({
      sql: `SELECT name, sql FROM sqlite_master WHERE type='index' AND name = ?`,
      args: [indexName]
    })

    if (result.rows.length > 0) {
      console.log(`✅ ${indexName}`)
      if (result.rows[0].sql) {
        console.log(`   ${result.rows[0].sql.replace(/\s+/g, ' ').trim()}`)
      }
    } else {
      console.log(`❌ ${indexName} - NOT FOUND!`)
      allExist = false
    }
    console.log()
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (allExist) {
    console.log('✅ جميع الـ Indexes موجودة!')
    console.log('✅ آمن للـ deployment على production')
  } else {
    console.log('❌ بعض الـ Indexes مفقودة!')
    console.log('⚠️  يجب تشغيل create-optimized-home-indexes.js أولاً')
    process.exit(1)
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Also check row counts to verify it's the right database
  console.log('📊 التحقق من حجم البيانات:\n')
  const moviesCount = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const seriesCount = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  
  console.log(`   Movies: ${moviesCount.rows[0].count.toLocaleString()}`)
  console.log(`   TV Series: ${seriesCount.rows[0].count.toLocaleString()}`)
  
  if (moviesCount.rows[0].count > 200000 && seriesCount.rows[0].count > 40000) {
    console.log('\n✅ حجم البيانات طبيعي (production database)')
  } else {
    console.log('\n⚠️  حجم البيانات صغير - تأكد إن ده الـ database الصح!')
  }

  turso.close()
}

verifyIndexes().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
