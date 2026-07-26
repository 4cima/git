// ============================================
// 🎬 سحب الأفلام الشعبية (Popular Movies)
// ============================================
require('dotenv').config({ path: './.env.local' })

const TMDB_KEY = process.env.TMDB_API_KEY || 'afef094e7c0de13c1cac98227a61da4d'
const TMDB_URL = 'https://api.themoviedb.org/3'

const START_PAGE = 1
const END_PAGE = 500 // 500 صفحة × 20 فيلم = 10,000 فيلم
const DELAY_MS = 300 // تأخير بين الطلبات

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchPopularMovies() {
  console.log('='.repeat(80))
  console.log('سحب الأفلام الشعبية من TMDB')
  console.log('='.repeat(80))
  console.log(`\nالصفحات: ${START_PAGE} - ${END_PAGE}`)
  console.log(`المتوقع: ~${(END_PAGE - START_PAGE + 1) * 20} فيلم\n`)
  
  const movieIds = []
  
  for (let page = START_PAGE; page <= END_PAGE; page++) {
    try {
      const url = `${TMDB_URL}/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=${page}`
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`❌ خطأ في الصفحة ${page}: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        const ids = data.results.map(m => m.id)
        movieIds.push(...ids)
        
        if (page % 10 === 0) {
          console.log(`   صفحة ${page}/${END_PAGE}: ${movieIds.length} فيلم حتى الآن`)
        }
      }
      
      await sleep(DELAY_MS)
      
    } catch (error) {
      console.error(`❌ خطأ في الصفحة ${page}:`, error.message)
    }
  }
  
  console.log(`\n✅ تم جمع ${movieIds.length} فيلم`)
  console.log(`\nالآن شغل: node scripts/INGEST-MOVIES-LOGIC.js`)
  console.log(`مع IDs: ${movieIds.slice(0, 10).join(',')}...`)
  
  // حفظ الـ IDs في ملف
  const fs = require('fs')
  fs.writeFileSync('popular-movie-ids.json', JSON.stringify(movieIds, null, 2))
  console.log(`\n✅ تم حفظ الـ IDs في: popular-movie-ids.json`)
}

fetchPopularMovies().catch(console.error)
