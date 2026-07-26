// ============================================
// 🎬 سحب مباشر للأفلام الشعبية (Popular + Top Rated)
// ============================================
require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')
const { translateContent } = require('./translation-service-cjs')
const { shouldFilterContent, getFilterReason } = require('./services/content-filter')

const TMDB_KEY = process.env.TMDB_API_KEY || 'afef094e7c0de13c1cac98227a61da4d'
const TMDB_URL = 'https://api.themoviedb.org/3'

// الإعدادات
const POPULAR_PAGES = 500
const TOP_RATED_PAGES = 500
const DELAY_MS = 300

const stats = {
  fetched: 0,
  inserted: 0,
  filtered: 0,
  errors: 0,
  start: Date.now()
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchMovieDetails(tmdbId) {
  try {
    const url = `${TMDB_URL}/movie/${tmdbId}?api_key=${TMDB_KEY}&language=en-US&append_to_response=credits,keywords`
    const response = await fetch(url)
    
    if (!response.ok) return null
    
    const data = await response.json()
    return data
  } catch (error) {
    return null
  }
}

async function processAndSaveMovie(movie) {
  stats.fetched++
  
  try {
    // تحقق إذا موجود
    const exists = db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(movie.id)
    if (exists) return
    
    // جلب التفاصيل الكاملة
    const details = await fetchMovieDetails(movie.id)
    if (!details) {
      stats.errors++
      return
    }
    
    // تطبيق الفلاتر
    const filtered = shouldFilterContent(details)
    
    if (filtered) {
      stats.filtered++
      const reason = getFilterReason(details)
      console.log(`   ⚠️  مفلتر: ${details.title} (${reason})`)
      
      // حفظ كمفلتر
      db.prepare(`
        INSERT INTO movies (
          tmdb_id, title_en, is_fetched, is_filtered, filter_reason, 
          created_at, updated_at
        ) VALUES (?, ?, 1, 1, ?, datetime('now'), datetime('now'))
      `).run(details.id, details.title, reason)
      
      return
    }
    
    // ترجمة
    const titleAr = await translateContent(details.title, 'ar')
    const overviewAr = details.overview ? await translateContent(details.overview, 'ar') : ''
    
    // حفظ في القاعدة
    const slug = generateSlug(details.title, details.release_date?.split('-')[0])
    
    db.prepare(`
      INSERT INTO movies (
        tmdb_id, slug, title_en, title_ar, overview_ar,
        poster_path, release_date, release_year, runtime,
        vote_average, vote_count, popularity,
        is_fetched, is_filtered, is_complete,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1, datetime('now'), datetime('now'))
    `).run(
      details.id,
      slug,
      details.title,
      titleAr,
      overviewAr,
      details.poster_path,
      details.release_date,
      details.release_date ? parseInt(details.release_date.split('-')[0]) : null,
      details.runtime,
      details.vote_average,
      details.vote_count,
      details.popularity
    )
    
    stats.inserted++
    console.log(`   ✅ ${details.title} (${details.release_date?.split('-')[0]})`)
    
  } catch (error) {
    stats.errors++
    console.error(`   ❌ خطأ: ${error.message}`)
  }
}

function generateSlug(title, year) {
  const base = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  
  return year ? `${base}-${year}` : base
}

async function fetchFromEndpoint(endpoint, pages, label) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`سحب ${label}`)
  console.log('='.repeat(80))
  
  for (let page = 1; page <= pages; page++) {
    try {
      const url = `${TMDB_URL}${endpoint}?api_key=${TMDB_KEY}&language=en-US&page=${page}`
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`❌ خطأ في الصفحة ${page}`)
        continue
      }
      
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        console.log(`\nصفحة ${page}/${pages}:`)
        
        for (const movie of data.results) {
          await processAndSaveMovie(movie)
          await sleep(100) // تأخير صغير
        }
      }
      
      if (page % 10 === 0) {
        const elapsed = (Date.now() - stats.start) / 60000
        console.log(`\n📊 التقدم: ${stats.fetched} مسحوب | ${stats.inserted} مضاف | ${stats.filtered} مفلتر | ${elapsed.toFixed(1)} دقيقة`)
      }
      
      await sleep(DELAY_MS)
      
    } catch (error) {
      console.error(`❌ خطأ في الصفحة ${page}:`, error.message)
    }
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('سحب مباشر للأفلام الشعبية والأعلى تقييماً')
  console.log('='.repeat(80))
  
  // 1. الأفلام الشعبية
  await fetchFromEndpoint('/movie/popular', POPULAR_PAGES, 'الأفلام الشعبية')
  
  // 2. الأفلام الأعلى تقييماً
  await fetchFromEndpoint('/movie/top_rated', TOP_RATED_PAGES, 'الأفلام الأعلى تقييماً')
  
  // 3. الأفلام الأحدث
  await fetchFromEndpoint('/movie/now_playing', 500, 'الأفلام الأحدث')
  
  console.log('\n' + '='.repeat(80))
  console.log('الملخص النهائي')
  console.log('='.repeat(80))
  console.log(`✅ مسحوب: ${stats.fetched}`)
  console.log(`✅ مضاف: ${stats.inserted}`)
  console.log(`⚠️  مفلتر: ${stats.filtered}`)
  console.log(`❌ أخطاء: ${stats.errors}`)
  console.log(`⏱️  الوقت: ${((Date.now() - stats.start) / 60000).toFixed(1)} دقيقة`)
  console.log('='.repeat(80))
}

main().catch(console.error)
