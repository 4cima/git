// ============================================
// 🎬 استيراد الأفلام المفقودة من TMDB
// ============================================
const fs = require('fs')
const path = require('path')
const db = require('./services/local-db')

const BATCH_SIZE = 10000
const stats = { total: 0, inserted: 0, skipped: 0, start: Date.now() }

async function main() {
  console.log('='.repeat(80))
  console.log('🎬 استيراد الأفلام المفقودة من TMDB')
  console.log('='.repeat(80))
  console.log('')
  
  const filePath = path.join(__dirname, '..', 'data', 'movie_ids_05_07_2026.json')
  
  console.log('📂 قراءة الملف...')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  
  console.log('📊 بناء قائمة IDs الموجودة...')
  const existing = new Set(db.prepare('SELECT tmdb_id FROM movies').all().map(m => m.tmdb_id))
  
  console.log(`📊 في الملف: ${lines.length.toLocaleString()}`)
  console.log(`📊 في القاعدة: ${existing.size.toLocaleString()}`)
  console.log('⏳ بدء الاستيراد...\n')
  
  const insertStmt = db.prepare(`
    INSERT INTO movies (tmdb_id, slug, title_ar, title_en, is_fetched, is_complete, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))
  `)
  
  let batch = []
  
  for (let i = 0; i < lines.length; i++) {
    try {
      const movie = JSON.parse(lines[i])
      
      if (existing.has(movie.id)) {
        stats.skipped++
        continue
      }
      
      const title = movie.original_title || `Movie ${movie.id}`
      const slug = `movie-${movie.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}`
      
      batch.push({ id: movie.id, slug, title_ar: title, title_en: title })
      
      if (batch.length >= BATCH_SIZE || i === lines.length - 1) {
        const transaction = db.transaction((items) => {
          for (const item of items) {
            insertStmt.run(item.id, item.slug, item.title_ar, item.title_en)
            stats.inserted++
          }
        })
        
        transaction(batch)
        stats.total += batch.length
        
        const elapsed = (Date.now() - stats.start) / 60000
        const rate = (stats.total / elapsed).toFixed(0)
        const progress = ((i + 1) / lines.length * 100).toFixed(1)
        
        console.log(`⏳ ${(i + 1).toLocaleString()}/${lines.length.toLocaleString()} (${progress}%) | ${stats.inserted.toLocaleString()} مضاف | ${rate}K/دقيقة`)
        
        batch = []
      }
    } catch (e) {
      console.error(`❌ خطأ في السطر ${i}:`, e.message)
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 الملخص')
  console.log('='.repeat(80))
  console.log(`✅ مضاف: ${stats.inserted.toLocaleString()}`)
  console.log(`🔄 متجاهل: ${stats.skipped.toLocaleString()}`)
  console.log(`⏱️ الوقت: ${((Date.now() - stats.start) / 60000).toFixed(1)} دقيقة`)
  console.log('='.repeat(80))
}

main().catch(console.error)
