#!/usr/bin/env node
const db = require('./scripts/services/local-db')

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('🔄 تصفير synced_to_turso في local.db')
  console.log('═══════════════════════════════════════════\n')
  
  // ============================================================
  // Check current state
  // ============================================================
  console.log('📊 الحالة الحالية:')
  console.log('───────────────────────────────────────────')
  
  const moviesSyncedBefore = db.prepare('SELECT COUNT(*) as count FROM movies WHERE synced_to_turso = 1').get()
  console.log(`🎬 Movies synced: ${moviesSyncedBefore.count}`)
  
  const seriesSyncedBefore = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE synced_to_turso = 1').get()
  console.log(`📺 TV Series synced: ${seriesSyncedBefore.count}`)
  
  // ============================================================
  // Reset flags
  // ============================================================
  console.log('\n🔄 جاري التصفير...')
  
  const moviesResult = db.prepare('UPDATE movies SET synced_to_turso = 0, synced_at = NULL').run()
  console.log(`✅ Movies: تم تصفير ${moviesResult.changes} صف`)
  
  const seriesResult = db.prepare('UPDATE tv_series SET synced_to_turso = 0, synced_at = NULL').run()
  console.log(`✅ TV Series: تم تصفير ${seriesResult.changes} صف`)
  
  // ============================================================
  // Verify
  // ============================================================
  console.log('\n🔍 التحقق بعد التصفير:')
  console.log('───────────────────────────────────────────')
  
  const moviesSyncedAfter = db.prepare('SELECT COUNT(*) as count FROM movies WHERE synced_to_turso = 1').get()
  console.log(`🎬 Movies synced: ${moviesSyncedAfter.count} (يجب أن يكون 0)`)
  
  const seriesSyncedAfter = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE synced_to_turso = 1').get()
  console.log(`📺 TV Series synced: ${seriesSyncedAfter.count} (يجب أن يكون 0)`)
  
  // ============================================================
  // Summary
  // ============================================================
  console.log('\n═══════════════════════════════════════════')
  console.log('📋 الملخص:')
  console.log('═══════════════════════════════════════════')
  
  if (moviesSyncedAfter.count === 0 && seriesSyncedAfter.count === 0) {
    console.log('✅ تم التصفير بنجاح')
    console.log(`   Movies: ${moviesSyncedBefore.count} → 0`)
    console.log(`   TV Series: ${seriesSyncedBefore.count} → 0`)
    console.log('')
    console.log('✅ جاهز للخطوة التالية: DELETE من Turso')
  } else {
    console.log('❌ خطأ: لم يتم التصفير بالكامل!')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
