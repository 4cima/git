#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const db = require('./scripts/services/local-db')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('📊 تأكيد الأعداد قبل DELETE')
  console.log('═══════════════════════════════════════════\n')
  
  // ============================================================
  // Turso Current Counts
  // ============================================================
  console.log('🗄️ العدد الحالي في Turso:')
  console.log('───────────────────────────────────────────')
  
  const tursoMoviesResult = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const tursoMoviesCount = Number(tursoMoviesResult.rows[0].count)
  console.log(`🎬 Movies: ${tursoMoviesCount} صف`)
  
  const tursoSeriesResult = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  const tursoSeriesCount = Number(tursoSeriesResult.rows[0].count)
  console.log(`📺 TV Series: ${tursoSeriesCount} صف`)
  
  // ============================================================
  // Local.db Ready to Sync
  // ============================================================
  console.log('\n💾 العدد الجاهز للمزامنة من local.db:')
  console.log('───────────────────────────────────────────')
  
  const localMoviesReady = db.prepare(`
    SELECT COUNT(*) as count FROM movies
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
  `).get()
  console.log(`🎬 Movies (ready): ${localMoviesReady.count} صف`)
  
  const localSeriesReady = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
  `).get()
  console.log(`📺 TV Series (ready): ${localSeriesReady.count} صف`)
  
  // ============================================================
  // Comparison
  // ============================================================
  console.log('\n📊 المقارنة:')
  console.log('───────────────────────────────────────────')
  
  console.log(`🎬 Movies:`)
  console.log(`   سيتم مسح: ${tursoMoviesCount} صف من Turso`)
  console.log(`   سيتم إضافة: ${localMoviesReady.count} صف من local.db`)
  console.log(`   الفرق الصافي: ${localMoviesReady.count - tursoMoviesCount > 0 ? '+' : ''}${localMoviesReady.count - tursoMoviesCount} صف`)
  
  console.log(`\n📺 TV Series:`)
  console.log(`   سيتم مسح: ${tursoSeriesCount} صف من Turso`)
  console.log(`   سيتم إضافة: ${localSeriesReady.count} صف من local.db`)
  console.log(`   الفرق الصافي: ${localSeriesReady.count - tursoSeriesCount > 0 ? '+' : ''}${localSeriesReady.count - tursoSeriesCount} صف`)
  
  // ============================================================
  // Warning if losing data
  // ============================================================
  console.log('\n⚠️ تحذيرات:')
  console.log('───────────────────────────────────────────')
  
  if (tursoMoviesCount > localMoviesReady.count) {
    console.log(`❌ تحذير: Turso فيه ${tursoMoviesCount - localMoviesReady.count} فيلم أكتر من local.db!`)
    console.log(`   (لكن هذا متوقع لأن Turso فيه genres_json مكسور)`)
  } else {
    console.log(`✅ local.db فيه ${localMoviesReady.count - tursoMoviesCount} فيلم إضافي`)
  }
  
  if (tursoSeriesCount > localSeriesReady.count) {
    console.log(`❌ تحذير: Turso فيه ${tursoSeriesCount - localSeriesReady.count} مسلسل أكتر من local.db!`)
  } else {
    console.log(`✅ local.db فيه ${localSeriesReady.count - tursoSeriesCount} مسلسل إضافي أو متساوي`)
  }
  
  // ============================================================
  // Summary
  // ============================================================
  console.log('\n═══════════════════════════════════════════')
  console.log('📋 الملخص:')
  console.log('═══════════════════════════════════════════')
  console.log(`الحالة الحالية (Turso): ${tursoMoviesCount} فيلم، ${tursoSeriesCount} مسلسل`)
  console.log(`بعد المزامنة (من local.db): ${localMoviesReady.count} فيلم، ${localSeriesReady.count} مسلسل`)
  console.log('')
  console.log('✅ جاهز للخطوة التالية: تصفير synced_to_turso في local.db')
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
