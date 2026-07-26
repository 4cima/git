// ============================================
// 🎬 سحب الأفلام الجديدة بالـ ID (من آخر ID موجود)
// ============================================
require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')

const TMDB_KEY = process.env.TMDB_API_KEY || 'afef094e7c0de13c1cac98227a61da4d'
const TMDB_URL = 'https://api.themoviedb.org/3'
const DELAY_MS = 100
const BATCH_SIZE = 100

const stats = { fetched: 0, inserted: 0, exists: 0, notFound: 0, errors: 0, start: Date.now() }

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log('🎬 سحب الأفلام الجديدة بالـ ID\n')
  console.log('='.repeat(80))
  
  // 1. البدء من ID 1 (سحب كل شيء!)
  const startId = 1
  
  console.log(`📊 آخر ID موجود: ${startId.toLocaleString()}`)
  
  // 2. الحصول على آخر ID في TMDB
  const latestResponse = await fetch(`${TMDB_URL}/movie/latest?api_key=${TMDB_KEY}`)
  const latest = await latestResponse.json()
  const endId = latest.id
  
  console.log(`📊 آخر ID في TMDB: ${endId.toLocaleString()}`)
  console.log(`📊 الفرق: ${(endId - startId).toLocaleString()} فيلم جديد`)
  console.log('='.repeat(80))
  
  // 3. السحب
  for (let id = startId + 1; id <= endId; id++) {
    try {
      // تحقق إذا موجود
      const exists = db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(id)
      if (exists) {
        stats.exists++
        
        // طباعة التقدم كل 10,000 فيلم موجود
        if (stats.exists % 10000 === 0) {
          const progress = ((id - startId) / (endId - startId) * 100).toFixed(1)
          console.log(`⏳ ${id.toLocaleString()}/${endId.toLocaleString()} (${progress}%) | ${stats.exists.toLocaleString()} موجود | ${stats.inserted} مضاف`)
        }
        
        continue
      }
      
      // سحب من TMDB
      const response = await fetch(`${TMDB_URL}/movie/${id}?api_key=${TMDB_KEY}`)
      
      if (response.status === 404) {
        stats.notFound++
        stats.fetched++
        continue
      }
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log(`⏳ Rate limit - انتظار 10 ثواني...`)
          await sleep(10000)
          id-- // إعادة المحاولة
          continue
        }
        stats.errors++
        continue
      }
      
      const movie = await response.json()
      
      // حفظ في القاعدة
      db.prepare(`
        INSERT INTO movies (tmdb_id, title_en, is_fetched, is_complete, created_at, updated_at)
        VALUES (?, ?, 0, 0, datetime('now'), datetime('now'))
      `).run(movie.id, movie.title || movie.original_title || `Movie ${movie.id}`)
      
      stats.inserted++
      stats.fetched++
      
      if (stats.fetched % BATCH_SIZE === 0) {
        const elapsed = (Date.now() - stats.start) / 60000
        const rate = (stats.fetched / elapsed).toFixed(0)
        const progress = ((id - startId) / (endId - startId) * 100).toFixed(1)
        console.log(`⏳ ${id.toLocaleString()}/${endId.toLocaleString()} (${progress}%) | ${stats.inserted} مضاف | ${rate}/دقيقة`)
      }
      
      await sleep(DELAY_MS)
      
    } catch (e) {
      stats.errors++
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 الملخص النهائي')
  console.log('='.repeat(80))
  console.log(`✅ مسحوب: ${stats.fetched.toLocaleString()}`)
  console.log(`✅ مضاف: ${stats.inserted.toLocaleString()}`)
  console.log(`🔄 موجود: ${stats.exists.toLocaleString()}`)
  console.log(`❌ غير موجود: ${stats.notFound.toLocaleString()}`)
  console.log(`❌ أخطاء: ${stats.errors.toLocaleString()}`)
  console.log(`⏱️ الوقت: ${((Date.now() - stats.start) / 60000).toFixed(1)} دقيقة`)
  console.log('='.repeat(80))
  console.log('\n✅ الآن شغّل: node scripts/INGEST-MOVIES-LOGIC.js')
}

main().catch(console.error)
