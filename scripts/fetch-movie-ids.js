// ============================================
// 🎬 سحب IDs الأفلام من TMDB (Popular + Top Rated + By Year + By Genre)
// ============================================
require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')

const TMDB_KEY = process.env.TMDB_API_KEY || 'afef094e7c0de13c1cac98227a61da4d'
const TMDB_URL = 'https://api.themoviedb.org/3'
const PAGES_PER_CATEGORY = 500
const DELAY_MS = 300

const stats = { fetched: 0, inserted: 0, duplicate: 0, errors: 0, start: Date.now() }

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchFromEndpoint(endpoint, pages, label, params = {}) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📥 سحب: ${label}`)
  console.log('='.repeat(80))
  
  for (let page = 1; page <= pages; page++) {
    try {
      const url = new URL(`${TMDB_URL}${endpoint}`)
      url.searchParams.set('api_key', TMDB_KEY)
      url.searchParams.set('language', 'en-US')
      url.searchParams.set('page', page)
      
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value)
      }
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log(`⏳ Rate limit - انتظار 10 ثواني...`)
          await sleep(10000)
          page--
          continue
        }
        continue
      }
      
      const data = await response.json()
      if (!data.results || data.results.length === 0) break
      
      for (const movie of data.results) {
        stats.fetched++
        
        const exists = db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(movie.id)
        if (exists) {
          stats.duplicate++
          continue
        }
        
        try {
          db.prepare(`
            INSERT INTO movies (tmdb_id, title_en, is_fetched, is_complete, created_at, updated_at)
            VALUES (?, ?, 0, 0, datetime('now'), datetime('now'))
          `).run(movie.id, movie.title || movie.original_title || `Movie ${movie.id}`)
          
          stats.inserted++
        } catch (e) {
          stats.errors++
        }
      }
      
      if (page % 10 === 0) {
        const elapsed = (Date.now() - stats.start) / 60000
        const rate = (stats.fetched / elapsed).toFixed(0)
        console.log(`   ⏳ صفحة ${page}/${pages} | ${stats.fetched} مسحوب | ${stats.inserted} مضاف | ${rate}/دقيقة`)
      }
      
      await sleep(DELAY_MS)
      
    } catch (error) {
      stats.errors++
    }
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('🎬 سحب IDs الأفلام من TMDB')
  console.log('='.repeat(80))
  
  await fetchFromEndpoint('/movie/popular', PAGES_PER_CATEGORY, 'الأفلام الشعبية')
  await fetchFromEndpoint('/movie/top_rated', PAGES_PER_CATEGORY, 'الأفلام الأعلى تقييماً')
  await fetchFromEndpoint('/movie/now_playing', PAGES_PER_CATEGORY, 'الأفلام الأحدث')
  await fetchFromEndpoint('/movie/upcoming', PAGES_PER_CATEGORY, 'الأفلام القادمة')
  
  for (let year = 2026; year >= 2015; year--) {
    await fetchFromEndpoint('/discover/movie', PAGES_PER_CATEGORY, `أفلام ${year}`, {
      'primary_release_year': year,
      'sort_by': 'popularity.desc'
    })
  }
  
  const genres = [
    { id: 28, name: 'أكشن' }, { id: 12, name: 'مغامرة' }, { id: 16, name: 'رسوم متحركة' },
    { id: 35, name: 'كوميديا' }, { id: 80, name: 'جريمة' }, { id: 18, name: 'دراما' },
    { id: 14, name: 'فانتازيا' }, { id: 27, name: 'رعب' }, { id: 9648, name: 'غموض' },
    { id: 878, name: 'خيال علمي' }, { id: 53, name: 'إثارة' }
  ]
  
  for (const genre of genres) {
    await fetchFromEndpoint('/discover/movie', PAGES_PER_CATEGORY, `أفلام ${genre.name}`, {
      'with_genres': genre.id,
      'sort_by': 'popularity.desc'
    })
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 الملخص النهائي')
  console.log('='.repeat(80))
  console.log(`✅ مسحوب: ${stats.fetched.toLocaleString()}`)
  console.log(`✅ مضاف: ${stats.inserted.toLocaleString()}`)
  console.log(`🔄 مكرر: ${stats.duplicate.toLocaleString()}`)
  console.log(`❌ أخطاء: ${stats.errors.toLocaleString()}`)
  console.log(`⏱️ الوقت: ${((Date.now() - stats.start) / 60000).toFixed(1)} دقيقة`)
  console.log('='.repeat(80))
  console.log('\n✅ الآن شغّل: node scripts/INGEST-MOVIES-LOGIC.js')
}

main().catch(console.error)
