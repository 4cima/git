// ============================================
// 🎬 استيراد أفلام TMDB بأقصى سرعة
// ============================================
const fs = require('fs')
const path = require('path')
const db = require('./services/local-db')

const BATCH_SIZE = 10000
const stats = { total: 0, inserted: 0, exists: 0, start: Date.now() }

async function main() {
  console.log('='.repeat(80))
  console.log('🎬 استيراد أفلام TMDB بأقصى سرعة')
  console.log('='.repeat(80))
  console.log('')
  
  const filePath = path.join(__dirname, '..', 'data', 'movie_ids_07_16_2026.json')
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ الملف غير موجود:', filePath)
    process.exit(1)
  }
  
  console.log('📂 قراءة الملف...')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  
  console.log(`📊 العدد الكلي: ${lines.length.toLocaleString()} فيلم`)
  console.log('⏳ بدء الاستيراد...\n')
  
  // Prepare statement
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO movies (tmdb_id, title_en, is_fetched, is_complete, created_at, updated_at)
    VALUES (?, ?, 0, 0, datetime('now'), datetime('now'))
  `)
  
  let batch = []
  
  for (let i = 0; i < lines.length; i++) {
    try {
      const movie = JSON.parse(lines[i])
      batch.push({ id: movie.id, title: movie.original_title || `Movie ${movie.id}` })
      
      if (batch.length >= BATCH_SIZE || i === lines.length - 1) {
        // Batch insert
        const transaction = db.transaction((items) => {
          for (const item of items) {
            const result = insertStmt.run(item.id, item.title)
            if (result.changes > 0) stats.inserted++
            else stats.exists++
          }
        })
        
        transaction(batch)
        stats.total += batch.length
        
        const elapsed = (Date.now() - stats.start) / 60000
        const rate = (stats.total / elapsed).toFixed(0)
        const progress = ((i + 1) / lines.length * 100).toFixed(1)
        
        console.log(`⏳ ${stats.total.toLocaleString()}/${lines.length.toLocaleString()} (${progress}%) | ${stats.inserted.toLocaleString()} مضاف | ${rate}K/دقيقة`)
        
        batch = []
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 الملخص')
  console.log('='.repeat(80))
  console.log(`✅ معالج: ${stats.total.toLocaleString()}`)
  console.log(`✅ مضاف: ${stats.inserted.toLocaleString()}`)
  console.log(`🔄 موجود: ${stats.exists.toLocaleString()}`)
  console.log(`⏱️ الوقت: ${((Date.now() - stats.start) / 60000).toFixed(1)} دقيقة`)
  console.log('='.repeat(80))
}

main().catch(console.error)
