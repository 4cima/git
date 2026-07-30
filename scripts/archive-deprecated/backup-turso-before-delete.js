#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const fs = require('fs')
const path = require('path')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('💾 Backup Turso قبل DELETE')
  console.log('═══════════════════════════════════════════\n')
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  
  // ============================================================
  // Backup Movies
  // ============================================================
  console.log('🎬 Backup Movies...')
  const moviesResult = await turso.execute('SELECT * FROM movies ORDER BY tmdb_id')
  const movies = moviesResult.rows
  
  console.log(`   عدد الأفلام: ${movies.length}`)
  
  const moviesFilename = `BACKUP-turso-movies-${timestamp}.json`
  const moviesPath = path.join(__dirname, moviesFilename)
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2))
  
  console.log(`   ✅ تم الحفظ في: ${moviesFilename}`)
  
  // Verify
  const moviesVerify = JSON.parse(fs.readFileSync(moviesPath, 'utf8'))
  console.log(`   ✅ تم التحقق: ${moviesVerify.length} صف في الملف`)
  
  if (moviesVerify.length !== movies.length) {
    throw new Error(`عدم تطابق! Turso: ${movies.length}, File: ${moviesVerify.length}`)
  }
  
  // ============================================================
  // Backup TV Series
  // ============================================================
  console.log('\n📺 Backup TV Series...')
  const seriesResult = await turso.execute('SELECT * FROM tv_series ORDER BY tmdb_id')
  const series = seriesResult.rows
  
  console.log(`   عدد المسلسلات: ${series.length}`)
  
  const seriesFilename = `BACKUP-turso-tv_series-${timestamp}.json`
  const seriesPath = path.join(__dirname, seriesFilename)
  fs.writeFileSync(seriesPath, JSON.stringify(series, null, 2))
  
  console.log(`   ✅ تم الحفظ في: ${seriesFilename}`)
  
  // Verify
  const seriesVerify = JSON.parse(fs.readFileSync(seriesPath, 'utf8'))
  console.log(`   ✅ تم التحقق: ${seriesVerify.length} صف في الملف`)
  
  if (seriesVerify.length !== series.length) {
    throw new Error(`عدم تطابق! Turso: ${series.length}, File: ${seriesVerify.length}`)
  }
  
  // ============================================================
  // Summary
  // ============================================================
  console.log('\n═══════════════════════════════════════════')
  console.log('✅ Backup مكتمل بنجاح')
  console.log('═══════════════════════════════════════════')
  console.log(`📁 Movies: ${moviesFilename} (${movies.length} صف)`)
  console.log(`📁 Series: ${seriesFilename} (${series.length} صف)`)
  console.log('')
  console.log('🔍 التحقق النهائي:')
  console.log(`   Turso movies: ${movies.length}`)
  console.log(`   File movies: ${moviesVerify.length}`)
  console.log(`   Match: ${movies.length === moviesVerify.length ? '✅' : '❌'}`)
  console.log('')
  console.log(`   Turso series: ${series.length}`)
  console.log(`   File series: ${seriesVerify.length}`)
  console.log(`   Match: ${series.length === seriesVerify.length ? '✅' : '❌'}`)
  
  // Show sample of first movie for verification
  if (movies.length > 0) {
    console.log('\n📋 عينة من أول فيلم في الـ backup:')
    console.log(`   tmdb_id: ${moviesVerify[0].tmdb_id}`)
    console.log(`   title_ar: ${moviesVerify[0].title_ar}`)
    console.log(`   title_en: ${moviesVerify[0].title_en}`)
  }
}

main().catch(err => {
  console.error('❌ خطأ في Backup:', err)
  process.exit(1)
})
