// ============================================
// 📺 سحب المسلسلات الجديدة من آخر ID موجود
// ============================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const db = require('./services/local-db')

const TMDB_KEY = process.env.TMDB_API_KEY
const TMDB_URL = 'https://api.themoviedb.org/3'
const DELAY_MS = 100
const BATCH_SIZE = 100

const stats = { fetched: 0, inserted: 0, exists: 0, notFound: 0, errors: 0, start: Date.now() }

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log('📺 سحب المسلسلات الجديدة بالـ ID\n')
  console.log('='.repeat(80))
  
  // 1. البدء من آخر ID موجود
  const result = db.prepare('SELECT MAX(tmdb_id) as max_id FROM tv_series').get()
  const startId = result.max_id || 0
  
  console.log(`📊 آخر ID موجود: ${startId.toLocaleString()}`)
  
  // 2. الحصول على آخر ID في TMDB
  const latestResponse = await fetch(`${TMDB_URL}/tv/latest?api_key=${TMDB_KEY}`)
  const latest = await latestResponse.json()
  const endId = latest.id
  
  console.log(`📊 آخر ID في TMDB: ${endId.toLocaleString()}`)
  console.log(`📊 الفرق: ${(endId - startId).toLocaleString()} مسلسل جديد`)
  console.log('='.repeat(80))
  
  // 3. السحب
  for (let id = startId + 1; id <= endId; id++) {
    try {
      // تحقق إذا موجود
      const exists = db.prepare('SELECT tmdb_id FROM tv_series WHERE tmdb_id = ?').get(id)
      if (exists) {
        stats.exists++
        continue
      }
      
      // سحب من TMDB
      const response = await fetch(`${TMDB_URL}/tv/${id}?api_key=${TMDB_KEY}`)
      
      if (response.status === 404) {
        stats.notFound++
        stats.fetched++
        if (stats.fetched % 1000 === 0) {
          const progress = ((id - startId) / (endId - startId) * 100).toFixed(1)
          const elapsed = (Date.now() - stats.start) / 60000
          const rate = (stats.fetched / elapsed).toFixed(0)
          console.log(`⏳ ${id.toLocaleString()}/${endId.toLocaleString()} (${progress}%) | ${stats.inserted} added | ${stats.notFound} not found | ${rate}/min`)
        }
        continue
      }
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log(`⏳ Rate limit - waiting 10 seconds...`)
          await sleep(10000)
          id-- // retry
          continue
        }
        stats.errors++
        continue
      }
      
      const series = await response.json()
      
      // حفظ في القاعدة
      db.prepare(`
        INSERT INTO tv_series (tmdb_id, name_en, is_fetched, is_complete, created_at, updated_at)
        VALUES (?, ?, 0, 0, datetime('now'), datetime('now'))
      `).run(series.id, series.name || series.original_name || `Series ${series.id}`)
      
      stats.inserted++
      stats.fetched++
      
      if (stats.fetched % BATCH_SIZE === 0) {
        const elapsed = (Date.now() - stats.start) / 60000
        const rate = (stats.fetched / elapsed).toFixed(0)
        const progress = ((id - startId) / (endId - startId) * 100).toFixed(1)
        console.log(`⏳ ${id.toLocaleString()}/${endId.toLocaleString()} (${progress}%) | ${stats.inserted} added | ${stats.notFound} not found | ${rate}/min`)
      }
      
      await sleep(DELAY_MS)
      
    } catch (e) {
      stats.errors++
      console.error(`❌ Error at ID ${id}: ${e.message}`)
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 Final Summary')
  console.log('='.repeat(80))
  console.log(`✅ Fetched: ${stats.fetched.toLocaleString()}`)
  console.log(`✅ Added: ${stats.inserted.toLocaleString()}`)
  console.log(`⚠️  Not Found (404): ${stats.notFound.toLocaleString()}`)
  console.log(`❌ Errors: ${stats.errors.toLocaleString()}`)
  console.log(`⏱️  Time: ${((Date.now() - stats.start) / 60000).toFixed(1)} minutes`)
}

main().catch(console.error)
