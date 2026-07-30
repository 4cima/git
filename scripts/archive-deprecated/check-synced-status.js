#!/usr/bin/env node
const db = require('./scripts/services/local-db')

// Check synced status
const synced = db.prepare('SELECT COUNT(*) as count FROM movies WHERE synced_to_turso = 1').get()
const notSynced = db.prepare('SELECT COUNT(*) as count FROM movies WHERE synced_to_turso = 0 AND is_complete = 1').get()

console.log('📊 حالة المزامنة في local.db:')
console.log('═══════════════════════════════════════════')
console.log('✅ أفلام مزامنة (synced_to_turso=1):', synced.count)
console.log('⏳ أفلام جاهزة غير مزامنة (is_complete=1, synced=0):', notSynced.count)

// Check the 50 test movies
console.log('\n🧪 عينة من الـ50 فيلم المختبرين:')
console.log('═══════════════════════════════════════════')
const testMovies = db.prepare(`
  SELECT tmdb_id, title_ar, synced_to_turso, synced_at
  FROM movies
  WHERE tmdb_id IN (788, 808, 862, 863, 790, 791, 792)
  ORDER BY tmdb_id
`).all()

testMovies.forEach(m => {
  console.log(`${m.tmdb_id} (${m.title_ar}):`)
  console.log(`  synced_to_turso = ${m.synced_to_turso}`)
  console.log(`  synced_at = ${m.synced_at || 'NULL'}`)
})

// Check series as well
const seriesSynced = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE synced_to_turso = 1').get()
const seriesNotSynced = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE synced_to_turso = 0 AND is_complete = 1').get()

console.log('\n📺 حالة المزامنة للمسلسلات:')
console.log('═══════════════════════════════════════════')
console.log('✅ مسلسلات مزامنة (synced_to_turso=1):', seriesSynced.count)
console.log('⏳ مسلسلات جاهزة غير مزامنة (is_complete=1, synced=0):', seriesNotSynced.count)

const testSeries = db.prepare(`
  SELECT tmdb_id, name_ar, synced_to_turso, synced_at
  FROM tv_series
  WHERE is_complete = 1
  LIMIT 3
`).all()

console.log('\n🧪 عينة من المسلسلات المختبرة:')
console.log('═══════════════════════════════════════════')
testSeries.forEach(s => {
  console.log(`${s.tmdb_id} (${s.name_ar}):`)
  console.log(`  synced_to_turso = ${s.synced_to_turso}`)
  console.log(`  synced_at = ${s.synced_at || 'NULL'}`)
})
