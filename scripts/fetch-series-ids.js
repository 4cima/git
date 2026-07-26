// ============================================
// 📺 سحب IDs المسلسلات من TMDB (Popular + Top Rated + By Year + By Genre)
// ============================================
require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')

const TMDB_KEY = process.env.TMDB_API_KEY_2 || '1298554bf3b09eee57972f0876ad096e'
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
      
      for (const series of data.results) {
        stats.fetched++
        
        const exists = db.prepare('SELECT id FROM tv_series WHERE tmdb_id = ?').get(series.id)
        if (exists) {
          stats.duplicate++
          continue
        }
        
        try {
          db.prepare(`
            INSERT INTO tv_series (tmdb_id, title_en, is_fetched, is_complete, created_at, updated_at)
            VALUES (?, ?, 0, 0, datetime('now'), datetime('now'))
          `).run(series.id, series.name || series.original_name || `Series ${series.id}`)
          
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
  console.log('📺 سحب IDs المسلسلات من TMDB')
  console.log('='.repeat(80))
  
  await fetchFromEndpoint('/tv/popular', PAGES_PER_CATEGORY, 'المسلسلات الشعبية')
  await fetchFromEndpoint('/tv/top_rated', PAGES_PER_CATEGORY, 'المسلسلات الأعلى تقييماً')
  await fetchFromEndpoint('/tv/on_the_air', PAGES_PER_CATEGORY, 'المسلسلات الأحدث')
  await fetchFromEndpoint('/tv/airing_today', PAGES_PER_CATEGORY, 'المسلسلات التي تُعرض اليوم')
  
  for (let year = 2026; year >= 2015; year--) {
    await fetchFromEndpoint('/discover/tv', PAGES_PER_CATEGORY, `مسلسلات ${year}`, {
      'first_air_date_year': year,
      'sort_by': 'popularity.desc'
    })
  }
  
  const genres = [
    { id: 10759, name: 'أكشن ومغامرة' }, { id: 16, name: 'رسوم متحركة' },
    { id: 35, name: 'كوميديا' }, { id: 80, name: 'جريمة' }, { id: 18, name: 'دراما' },
    { id: 10751, name: 'عائلي' }, { id: 9648, name: 'غموض' },
    { id: 10765, name: 'خيال علمي وفانتازيا' }
  ]
  
  for (const genre of genres) {
    await fetchFromEndpoint('/discover/tv', PAGES_PER_CATEGORY, `مسلسلات ${genre.name}`, {
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
  console.log('\n✅ الآن شغّل: node scripts/INGEST-SERIES-LOGIC.js')
}

main().catch(console.error)
