/**
 * الخطوة (d): فحص الـ484 فيلم في Turso بالفلتر المعدّل
 * وتحديث filter_status الحقيقي
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const { isExplicitContent } = require('./scripts/services/content-filter.js')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE = 'https://api.themoviedb.org/3'

async function fetchMovieFromTMDB(tmdbId) {
  const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=keywords,credits,release_dates`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }
  return await response.json()
}

async function main() {
  console.log('📋 الخطوة (d): فحص الـ484 فيلم وتحديث filter_status\n')

  // ═══════════════════════════════════════════════════════════
  // 1) جلب كل الأفلام من Turso
  // ═══════════════════════════════════════════════════════════
  console.log('🔄 جلب الأفلام من Turso...')
  const moviesResult = await turso.execute('SELECT tmdb_id, title_ar FROM movies ORDER BY tmdb_id')
  const movies = moviesResult.rows
  console.log(`   ✅ إجمالي: ${movies.length} فيلم\n`)

  // ═══════════════════════════════════════════════════════════
  // 2) فحص كل فيلم بالفلتر المعدّل
  // ═══════════════════════════════════════════════════════════
  const toBlocked = []
  const toNeedsReview = []
  const toClean = []

  console.log('🔍 فحص كل فيلم بالفلتر المعدّل...\n')

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i]
    const tmdbId = movie.tmdb_id

    if ((i + 1) % 50 === 0) {
      console.log(`   ... ${i + 1}/${movies.length}`)
    }

    try {
      // جلب البيانات الكاملة من TMDB
      const fullContent = await fetchMovieFromTMDB(tmdbId)
      
      // فحص بالفلتر المعدّل
      const filterResult = isExplicitContent(fullContent)
      
      if (filterResult.blocked) {
        if (filterResult.needsReview) {
          toNeedsReview.push({ 
            tmdbId, 
            title: movie.title_ar, 
            reason: filterResult.reason 
          })
        } else {
          toBlocked.push({ 
            tmdbId, 
            title: movie.title_ar, 
            reason: filterResult.reason 
          })
        }
      } else {
        toClean.push(tmdbId)
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`   ❌ خطأ في فحص ${tmdbId}: ${error.message}`)
      // في حالة الخطأ، نعتبره clean (conservative approach)
      toClean.push(tmdbId)
    }
  }

  console.log('\n✅ انتهى الفحص\n')

  // ═══════════════════════════════════════════════════════════
  // 3) طباعة النتائج
  // ═══════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────')
  console.log('📊 نتائج الفحص:')
  console.log('─────────────────────────────────────────────────')
  console.log(`   blocked: ${toBlocked.length}`)
  console.log(`   needs_review: ${toNeedsReview.length}`)
  console.log(`   clean: ${toClean.length}`)
  console.log(`   الإجمالي: ${toBlocked.length + toNeedsReview.length + toClean.length}\n`)

  if (toBlocked.length > 0) {
    console.log('🔴 الأفلام blocked:')
    toBlocked.forEach(m => {
      console.log(`   [${m.tmdbId}] ${m.title}`)
      console.log(`       السبب: ${m.reason}`)
    })
    console.log()
  }

  if (toNeedsReview.length > 0) {
    console.log('🟡 الأفلام needs_review:')
    toNeedsReview.forEach(m => {
      console.log(`   [${m.tmdbId}] ${m.title}`)
      console.log(`       السبب: ${m.reason}`)
    })
    console.log()
  }

  // ═══════════════════════════════════════════════════════════
  // 4) تحديث filter_status في Turso
  // ═══════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────')
  console.log('🔧 تحديث filter_status في Turso:')
  console.log('─────────────────────────────────────────────────\n')

  // Update blocked
  if (toBlocked.length > 0) {
    console.log(`🔴 تحديث ${toBlocked.length} فيلم إلى 'blocked'...`)
    const blockedIds = toBlocked.map(m => m.tmdbId)
    const placeholders = blockedIds.map(() => '?').join(',')
    const updateBlocked = await turso.execute({
      sql: `UPDATE movies SET filter_status = 'blocked' WHERE tmdb_id IN (${placeholders})`,
      args: blockedIds
    })
    console.log(`   ✅ عدد الصفوف المتأثرة: ${updateBlocked.rowsAffected}\n`)
  }

  // Update needs_review
  if (toNeedsReview.length > 0) {
    console.log(`🟡 تحديث ${toNeedsReview.length} فيلم إلى 'needs_review'...`)
    const reviewIds = toNeedsReview.map(m => m.tmdbId)
    const placeholders = reviewIds.map(() => '?').join(',')
    const updateReview = await turso.execute({
      sql: `UPDATE movies SET filter_status = 'needs_review' WHERE tmdb_id IN (${placeholders})`,
      args: reviewIds
    })
    console.log(`   ✅ عدد الصفوف المتأثرة: ${updateReview.rowsAffected}\n`)
  }

  // Update clean
  if (toClean.length > 0) {
    console.log(`🟢 تحديث ${toClean.length} فيلم إلى 'clean'...`)
    // نستخدم batch updates لتجنب query طويل جداً
    const batchSize = 100
    let totalAffected = 0
    
    for (let i = 0; i < toClean.length; i += batchSize) {
      const batch = toClean.slice(i, i + batchSize)
      const placeholders = batch.map(() => '?').join(',')
      const updateClean = await turso.execute({
        sql: `UPDATE movies SET filter_status = 'clean' WHERE tmdb_id IN (${placeholders})`,
        args: batch
      })
      totalAffected += updateClean.rowsAffected
    }
    
    console.log(`   ✅ عدد الصفوف المتأثرة: ${totalAffected}\n`)
  }

  // ═══════════════════════════════════════════════════════════
  // 5) التحقق النهائي
  // ═══════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────')
  console.log('📊 SELECT COUNT(*) GROUP BY filter_status (النهائي):')
  console.log('─────────────────────────────────────────────────\n')

  const finalCount = await turso.execute(`
    SELECT filter_status, COUNT(*) as count 
    FROM movies 
    GROUP BY filter_status 
    ORDER BY filter_status
  `)

  finalCount.rows.forEach(row => {
    console.log(`   ${row.filter_status}: ${row.count}`)
  })

  const total = finalCount.rows.reduce((sum, row) => sum + row.count, 0)
  console.log(`   ───────────────`)
  console.log(`   الإجمالي: ${total}\n`)

  // ═══════════════════════════════════════════════════════════
  // 6) التحقق من الـ6 أفلام المعروفة
  // ═══════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────')
  console.log('✅ التحقق من الـ6 أفلام المعروفة:')
  console.log('─────────────────────────────────────────────────\n')

  const knownMovies = [
    { id: 33, title: 'Unforgiven', expected: 'needs_review' },
    { id: 103, title: 'Taxi Driver', expected: 'blocked' },
    { id: 115, title: 'The Big Lebowski', expected: 'blocked' },
    { id: 128, title: 'Princess Mononoke', expected: 'needs_review' },
    { id: 142, title: 'Brokeback Mountain', expected: 'needs_review' },
    { id: 145, title: 'Breaking the Waves', expected: 'needs_review' }
  ]

  for (const movie of knownMovies) {
    const result = await turso.execute({
      sql: 'SELECT tmdb_id, title_ar, filter_status FROM movies WHERE tmdb_id = ?',
      args: [movie.id]
    })
    if (result.rows.length > 0) {
      const row = result.rows[0]
      const isCorrect = row.filter_status === movie.expected
      const icon = isCorrect ? '✅' : '❌'
      console.log(`   ${icon} [${row.tmdb_id}] ${movie.title}`)
      console.log(`       المتوقع: ${movie.expected}, الفعلي: ${row.filter_status}`)
    } else {
      console.log(`   ⚠️  [${movie.id}] ${movie.title} — غير موجود في Turso`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════')
  console.log('✅ الخطوة (d) اكتملت')
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
