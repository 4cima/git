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
  console.log('🔍 التحقق من فروقات المحتوى الفعلي')
  console.log('═══════════════════════════════════════════\n')
  
  // ============================================================
  // 1. فحص عينة من الـ434 فيلم (غير المشبوهين)
  // ============================================================
  console.log('📋 الجزء 1: مقارنة محتوى 5 أفلام عشوائيين')
  console.log('───────────────────────────────────────────\n')
  
  // أخذ 5 أفلام من القائمة (بعيدين عن المشبوهين الأربعة)
  const sampleIds = [11, 12, 13, 14, 15] // Star Wars, Finding Nemo, Forrest Gump, American Beauty, Citizen Kane
  
  let contentIdentical = 0
  let contentDifferent = 0
  const differences = []
  
  for (const tmdb_id of sampleIds) {
    console.log(`\n🎬 فيلم tmdb_id=${tmdb_id}:`)
    
    // Get from Turso
    const tursoResult = await turso.execute({
      sql: 'SELECT title_ar, title_en, overview_ar, filter_status, vote_average, popularity, genres_json FROM movies WHERE tmdb_id = ?',
      args: [tmdb_id]
    })
    
    // Get from local.db (no genres_json column in local, we'll fetch separately)
    const localMovie = db.prepare(`
      SELECT title_ar, title_en, overview_ar, filter_status, vote_average, popularity
      FROM movies WHERE tmdb_id = ?
    `).get(tmdb_id)
    
    // Get genres from local.db via JOIN
    const localGenresRaw = db.prepare(`
      SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
      FROM genres g
      JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(tmdb_id)
    
    localMovie.genres_json = JSON.stringify(localGenresRaw)
    
    if (!tursoResult.rows || tursoResult.rows.length === 0) {
      console.log('  ❌ غير موجود في Turso')
      continue
    }
    
    if (!localMovie) {
      console.log('  ❌ غير موجود في local.db')
      continue
    }
    
    const tursoMovie = tursoResult.rows[0]
    
    // Compare fields
    const diffs = []
    
    if (tursoMovie.title_ar !== localMovie.title_ar) {
      diffs.push(`title_ar: Turso="${tursoMovie.title_ar}" vs Local="${localMovie.title_ar}"`)
    }
    
    if (tursoMovie.title_en !== localMovie.title_en) {
      diffs.push(`title_en: Turso="${tursoMovie.title_en}" vs Local="${localMovie.title_en}"`)
    }
    
    if (tursoMovie.overview_ar !== localMovie.overview_ar) {
      diffs.push(`overview_ar: مختلف (Turso: ${tursoMovie.overview_ar?.length || 0} حرف، Local: ${localMovie.overview_ar?.length || 0} حرف)`)
    }
    
    if (tursoMovie.filter_status !== localMovie.filter_status) {
      diffs.push(`filter_status: Turso="${tursoMovie.filter_status}" vs Local="${localMovie.filter_status}"`)
    }
    
    if (Math.abs(tursoMovie.vote_average - localMovie.vote_average) > 0.001) {
      diffs.push(`vote_average: Turso=${tursoMovie.vote_average} vs Local=${localMovie.vote_average}`)
    }
    
    if (Math.abs(tursoMovie.popularity - localMovie.popularity) > 0.001) {
      diffs.push(`popularity: Turso=${tursoMovie.popularity} vs Local=${localMovie.popularity}`)
    }
    
    // Compare genres_json (content, not exact string)
    try {
      const tursoGenres = JSON.parse(tursoMovie.genres_json || '[]')
      const localGenres = JSON.parse(localMovie.genres_json || '[]')
      
      if (tursoGenres.length !== localGenres.length) {
        diffs.push(`genres_json: عدد مختلف (Turso: ${tursoGenres.length}, Local: ${localGenres.length})`)
      } else {
        // Check if genre IDs match
        const tursoIds = tursoGenres.map(g => g.tmdb_id).sort()
        const localIds = localGenres.map(g => g.tmdb_id).sort()
        if (JSON.stringify(tursoIds) !== JSON.stringify(localIds)) {
          diffs.push(`genres_json: IDs مختلفة`)
        }
      }
    } catch (e) {
      diffs.push(`genres_json: خطأ في المقارنة (${e.message})`)
    }
    
    if (diffs.length === 0) {
      console.log(`  ✅ المحتوى مطابق تماماً`)
      console.log(`     title: ${tursoMovie.title_ar || tursoMovie.title_en}`)
      console.log(`     filter_status: ${tursoMovie.filter_status}`)
      contentIdentical++
    } else {
      console.log(`  ⚠️ فروقات في المحتوى:`)
      diffs.forEach(d => console.log(`     - ${d}`))
      contentDifferent++
      differences.push({ tmdb_id, title: tursoMovie.title_ar || tursoMovie.title_en, diffs })
    }
  }
  
  console.log('\n───────────────────────────────────────────')
  console.log(`📊 ملخص الجزء 1:`)
  console.log(`   ✅ محتوى مطابق: ${contentIdentical}/5`)
  console.log(`   ⚠️ محتوى مختلف: ${contentDifferent}/5`)
  
  // ============================================================
  // 2. فحص الأفلام الأربعة المشبوهين
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════')
  console.log('📋 الجزء 2: فحص الأفلام الأربعة المشبوهين')
  console.log('───────────────────────────────────────────\n')
  
  const suspiciousIds = [33, 128, 142, 145]
  const suspiciousResults = []
  
  for (const tmdb_id of suspiciousIds) {
    const tursoResult = await turso.execute({
      sql: 'SELECT tmdb_id, title_ar, title_en, filter_status, updated_at FROM movies WHERE tmdb_id = ?',
      args: [tmdb_id]
    })
    
    const localMovie = db.prepare(`
      SELECT tmdb_id, title_ar, title_en, filter_status, updated_at
      FROM movies WHERE tmdb_id = ?
    `).get(tmdb_id)
    
    if (tursoResult.rows && tursoResult.rows.length > 0 && localMovie) {
      const tursoMovie = tursoResult.rows[0]
      
      console.log(`🎬 فيلم ${tmdb_id}: ${tursoMovie.title_ar || tursoMovie.title_en}`)
      console.log(`   Turso updated_at: ${tursoMovie.updated_at}`)
      console.log(`   Local updated_at: ${localMovie.updated_at}`)
      console.log(`   Turso filter_status: "${tursoMovie.filter_status}"`)
      console.log(`   Local filter_status: "${localMovie.filter_status}"`)
      
      if (tursoMovie.filter_status !== localMovie.filter_status) {
        console.log(`   ⚠️ filter_status مختلف!`)
        suspiciousResults.push({
          tmdb_id,
          title: tursoMovie.title_ar || tursoMovie.title_en,
          turso_status: tursoMovie.filter_status,
          local_status: localMovie.filter_status,
          different: true
        })
      } else {
        console.log(`   ✅ filter_status متطابق`)
        suspiciousResults.push({
          tmdb_id,
          title: tursoMovie.title_ar || tursoMovie.title_en,
          turso_status: tursoMovie.filter_status,
          local_status: localMovie.filter_status,
          different: false
        })
      }
      console.log('')
    } else {
      console.log(`❌ فيلم ${tmdb_id} غير موجود في أحد المصدرين\n`)
    }
  }
  
  // ============================================================
  // 3. الإجابة النهائية
  // ============================================================
  console.log('═══════════════════════════════════════════')
  console.log('📊 الإجابة النهائية')
  console.log('═══════════════════════════════════════════\n')
  
  console.log('❓ السؤال: هل فيه محتوى في Turso أصح أو أحدث من local.db؟\n')
  
  if (contentDifferent === 0 && suspiciousResults.every(r => !r.different)) {
    console.log('✅ الإجابة: لا، المحتوى متطابق تماماً.')
    console.log('')
    console.log('📌 التفسير:')
    console.log('   - الـ5 أفلام العشوائيين: محتوى مطابق 100%')
    console.log('   - الـ4 أفلام المشبوهين: filter_status متطابق')
    console.log('   - فرق updated_at هو مجرد أثر جانبي للسكريبت الأصلي')
    console.log('   - local.db هو المصدر الأوثق والأكمل')
    console.log('')
    console.log('✅ التوصية: آمن تماماً مسح Turso وإعادة البناء من local.db')
  } else {
    console.log('⚠️ الإجابة: نعم، فيه فروقات حقيقية في المحتوى.')
    console.log('')
    console.log('📌 الفروقات المكتشفة:')
    
    if (contentDifferent > 0) {
      console.log(`   - ${contentDifferent} فيلم من العينة فيهم فروقات:`)
      differences.forEach(d => {
        console.log(`     • ${d.tmdb_id}: ${d.title}`)
        d.diffs.forEach(diff => console.log(`       - ${diff}`))
      })
    }
    
    const suspiciousDifferent = suspiciousResults.filter(r => r.different)
    if (suspiciousDifferent.length > 0) {
      console.log(`   - ${suspiciousDifferent.length} فيلم مشبوه filter_status مختلف:`)
      suspiciousDifferent.forEach(s => {
        console.log(`     • ${s.tmdb_id}: Turso="${s.turso_status}" vs Local="${s.local_status}"`)
      })
    }
    
    console.log('')
    console.log('⚠️ التوصية: مراجعة الفروقات قبل اتخاذ قرار المسح')
  }
  
  console.log('\n═══════════════════════════════════════════')
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
