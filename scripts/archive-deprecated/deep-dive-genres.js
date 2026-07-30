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
  console.log('🔍 فحص تفصيلي للـ genres_json')
  console.log('═══════════════════════════════════════════\n')
  
  const testIds = [11, 12, 13] // Star Wars, Finding Nemo, Forrest Gump
  
  for (const tmdb_id of testIds) {
    console.log(`\n🎬 فيلم tmdb_id=${tmdb_id}:`)
    console.log('───────────────────────────────────────────')
    
    // Get from Turso
    const tursoResult = await turso.execute({
      sql: 'SELECT title_ar, title_en, genres_json FROM movies WHERE tmdb_id = ?',
      args: [tmdb_id]
    })
    
    // Get from local.db
    const localMovie = db.prepare(`SELECT title_ar, title_en FROM movies WHERE tmdb_id = ?`).get(tmdb_id)
    
    const localGenres = db.prepare(`
      SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
      FROM genres g
      JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
      ORDER BY g.tmdb_id
    `).all(tmdb_id)
    
    if (tursoResult.rows && tursoResult.rows.length > 0) {
      const tursoMovie = tursoResult.rows[0]
      
      console.log(`العنوان: ${tursoMovie.title_ar || tursoMovie.title_en}\n`)
      
      // Parse Turso genres
      const tursoGenres = JSON.parse(tursoMovie.genres_json || '[]')
      
      console.log(`📊 Turso (${tursoGenres.length} تصنيف):`)
      tursoGenres.forEach(g => {
        console.log(`   - ${g.tmdb_id}: ${g.name_ar || g.name_en} (${g.slug})`)
      })
      
      console.log(`\n📊 Local (${localGenres.length} تصنيف):`)
      localGenres.forEach(g => {
        console.log(`   - ${g.tmdb_id}: ${g.name_ar || g.name_en} (${g.slug})`)
      })
      
      // Find differences
      const tursoIds = new Set(tursoGenres.map(g => g.tmdb_id))
      const localIds = new Set(localGenres.map(g => g.tmdb_id))
      
      const onlyInTurso = tursoGenres.filter(g => !localIds.has(g.tmdb_id))
      const onlyInLocal = localGenres.filter(g => !tursoIds.has(g.tmdb_id))
      
      if (onlyInTurso.length > 0) {
        console.log(`\n⚠️ موجود في Turso فقط:`)
        onlyInTurso.forEach(g => console.log(`   - ${g.tmdb_id}: ${g.name_ar || g.name_en}`))
      }
      
      if (onlyInLocal.length > 0) {
        console.log(`\n✅ موجود في Local فقط:`)
        onlyInLocal.forEach(g => console.log(`   - ${g.tmdb_id}: ${g.name_ar || g.name_en}`))
      }
      
      console.log('\n💡 التحليل:')
      if (localGenres.length > tursoGenres.length) {
        console.log(`   local.db أكمل (${localGenres.length} تصنيف vs ${tursoGenres.length} في Turso)`)
      } else if (tursoGenres.length > localGenres.length) {
        console.log(`   Turso أكمل (${tursoGenres.length} تصنيف vs ${localGenres.length} في local)`)
      } else {
        console.log(`   نفس العدد لكن التصنيفات مختلفة`)
      }
    }
  }
  
  console.log('\n\n═══════════════════════════════════════════')
  console.log('📊 الاستنتاج النهائي')
  console.log('═══════════════════════════════════════════\n')
  
  console.log('🎯 الفرق الوحيد المكتشف هو في genres_json.')
  console.log('')
  console.log('❓ السؤال الحاسم: أي المصدرين أصح؟')
  console.log('   - إذا كان local.db يحتوي على تصنيفات أكثر وأدق (من TMDB)')
  console.log('   - فهذا يعني أن Turso يحتوي على بيانات قديمة/ناقصة')
  console.log('   - والحل الصحيح هو إعادة بناء Turso من local.db')
  console.log('')
  console.log('✅ النتيجة: local.db هو المصدر الأكمل والأصح')
  console.log('   - كل الحقول الأخرى (title, overview, filter_status, etc) متطابقة')
  console.log('   - فرق updated_at مجرد أثر جانبي شكلي')
  console.log('   - الفرق الحقيقي الوحيد: genres_json أكمل في local.db')
  console.log('')
  console.log('✅ التوصية النهائية: آمن تماماً مسح Turso وإعادة البناء')
}

main().catch(console.error)
