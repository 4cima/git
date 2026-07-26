// ============================================
// 📺 سحب المسلسلات الشعبية والأعلى تقييماً
// ============================================
require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')

const TMDB_KEY = process.env.TMDB_API_KEY || 'afef094e7c0de13c1cac98227a61da4d'
const TMDB_URL = 'https://api.themoviedb.org/3'

// الإعدادات
const POPULAR_PAGES = 500
const TOP_RATED_PAGES = 500
const DELAY_MS = 300

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchAndInsertSeries(endpoint, pages, label) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`سحب ${label}`)
  console.log('='.repeat(80))
  
  let inserted = 0
  let skipped = 0
  
  for (let page = 1; page <= pages; page++) {
    try {
      const url = `${TMDB_URL}${endpoint}?api_key=${TMDB_KEY}&language=en-US&page=${page}`
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`❌ خطأ في الصفحة ${page}: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        for (const series of data.results) {
          // تحقق إذا المسلسل موجود
          const exists = db.prepare('SELECT id FROM tv_series WHERE tmdb_id = ?').get(series.id)
          
          if (!exists) {
            // إضافة المسلسل للقاعدة المحلية
            try {
              db.prepare(`
                INSERT INTO tv_series (tmdb_id, is_fetched, created_at, updated_at)
                VALUES (?, 0, datetime('now'), datetime('now'))
              `).run(series.id)
              inserted++
            } catch (err) {
              // تجاهل الأخطاء (ربما مكرر)
            }
          } else {
            skipped++
          }
        }
        
        if (page % 10 === 0) {
          console.log(`   صفحة ${page}/${pages}: ${inserted} جديد | ${skipped} موجود`)
        }
      }
      
      await sleep(DELAY_MS)
      
    } catch (error) {
      console.error(`❌ خطأ في الصفحة ${page}:`, error.message)
    }
  }
  
  console.log(`\n✅ ${label}: ${inserted} مسلسل جديد | ${skipped} موجود مسبقاً`)
  return inserted
}

async function main() {
  console.log('='.repeat(80))
  console.log('سحب المسلسلات الشعبية والأعلى تقييماً من TMDB')
  console.log('='.repeat(80))
  
  let totalInserted = 0
  
  // 1. المسلسلات الشعبية
  const popular = await fetchAndInsertSeries('/tv/popular', POPULAR_PAGES, 'المسلسلات الشعبية')
  totalInserted += popular
  
  // 2. المسلسلات الأعلى تقييماً
  const topRated = await fetchAndInsertSeries('/tv/top_rated', TOP_RATED_PAGES, 'المسلسلات الأعلى تقييماً')
  totalInserted += topRated
  
  // 3. المسلسلات الأحدث
  const onAir = await fetchAndInsertSeries('/tv/on_the_air', 500, 'المسلسلات الأحدث')
  totalInserted += onAir
  
  console.log('\n' + '='.repeat(80))
  console.log('الملخص النهائي')
  console.log('='.repeat(80))
  console.log(`✅ تم إضافة ${totalInserted} مسلسل جديد للقاعدة المحلية`)
  console.log(`\nالآن شغل: node scripts/INGEST-SERIES-LOGIC.js`)
  console.log('='.repeat(80))
}

main().catch(console.error)
