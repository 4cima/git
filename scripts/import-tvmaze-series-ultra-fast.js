// ============================================
// 📺 استيراد مسلسلات TVMaze بأقصى سرعة
// ============================================
const fs = require('fs')
const path = require('path')
const db = require('./services/local-db')

const BATCH_SIZE = 10000
const stats = { total: 0, inserted: 0, exists: 0, start: Date.now() }

async function main() {
  console.log('='.repeat(80))
  console.log('📺 استيراد مسلسلات TVMaze بأقصى سرعة')
  console.log('='.repeat(80))
  console.log('')
  
  const filePath = path.join(__dirname, '..', 'data', 'tvmaze_shows_05_07_2026.json')
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ الملف غير موجود:', filePath)
    process.exit(1)
  }
  
  console.log('📂 قراءة الملف...')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  
  console.log(`📊 العدد الكلي: ${lines.length.toLocaleString()} مسلسل`)
  console.log('⏳ بدء الاستيراد...\n')
  
  // Prepare statement - استخدام tmdb_id سالب لـ TVMaze
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO tv_series (tvmaze_id, tmdb_id, slug, title_ar, title_en, source, is_fetched, is_complete, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'tvmaze', 0, 0, datetime('now'), datetime('now'))
  `)
  
  let batch = []
  
  for (let i = 0; i < lines.length; i++) {
    try {
      const show = JSON.parse(lines[i])
      // استخدام tmdb_id سالب لـ TVMaze لتجنب التعارض
      const fakeTmdbId = -show.id
      const slug = `tvmaze-${show.id}-${(show.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      batch.push({ 
        tvmaze_id: show.id, 
        tmdb_id: fakeTmdbId,
        slug: slug,
        title_ar: show.name || `Show ${show.id}`,
        title_en: show.name || `Show ${show.id}`
      })
      
      if (batch.length >= BATCH_SIZE || i === lines.length - 1) {
        // Batch insert
        const transaction = db.transaction((items) => {
          for (const item of items) {
            const result = insertStmt.run(item.tvmaze_id, item.tmdb_id, item.slug, item.title_ar, item.title_en)
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
