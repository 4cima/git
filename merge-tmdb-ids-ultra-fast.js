// دمج IDs بسرعة فائقة - دفعة واحدة
const Database = require('better-sqlite3')
const fs = require('fs')

const db = new Database('./data/4cima-local.db')

console.log('\n🚀 دمج IDs بسرعة فائقة\n')

function mergeFile(filePath, table) {
  console.log(`📂 معالجة: ${filePath}`)
  
  if (!fs.existsSync(filePath)) {
    console.log('   ⚠️  الملف غير موجود!')
    return { existing: 0, added: 0 }
  }
  
  const startTime = Date.now()
  
  // 1. قراءة الملف كامل مرة واحدة
  console.log('   📖 قراءة الملف...')
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.trim().split('\n')
  console.log(`   ✅ تم قراءة ${lines.length.toLocaleString()} سطر`)
  
  // 2. استخراج IDs الموجودة في القاعدة (استعلام واحد)
  console.log('   🔍 فحص IDs الموجودة...')
  const existingIds = new Set(
    db.prepare(`SELECT id FROM ${table}`).all().map(r => r.id)
  )
  console.log(`   ✅ ${existingIds.size.toLocaleString()} ID موجود`)
  
  // 3. تحضير IDs الجديدة فقط
  console.log('   🆕 استخراج IDs الجديدة...')
  const newRecords = []
  
  for (const line of lines) {
    try {
      const record = JSON.parse(line)
      if (record.adult === true) continue // تخطي adult
      if (!existingIds.has(record.id)) {
        newRecords.push({
          id: record.id,
          title: record.title || record.name || `Item ${record.id}`
        })
      }
    } catch (e) {
      continue
    }
  }
  
  console.log(`   ✅ ${newRecords.length.toLocaleString()} ID جديد للإضافة`)
  
  if (newRecords.length === 0) {
    console.log('   ℹ️  لا يوجد IDs جديدة\n')
    return { existing: existingIds.size, added: 0 }
  }
  
  // 4. إدخال الكل دفعة واحدة (transaction واحد)
  console.log('   💾 إدخال IDs الجديدة...')
  
  const titleCol = table === 'tv_series' ? 'name' : 'title'
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO ${table} (
      id, tmdb_id, slug, 
      ${titleCol}_ar, ${titleCol}_en,
      source
    ) VALUES (?, ?, ?, 'TBD', ?, 'tmdb')
  `)
  
  const insertMany = db.transaction((records) => {
    for (const rec of records) {
      insertStmt.run(rec.id, rec.id, `temp-${rec.id}`, rec.title)
    }
  })
  
  insertMany(newRecords)
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`   ✅ تم! في ${elapsed} ثانية\n`)
  
  return { existing: existingIds.size, added: newRecords.length }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║         دمج IDs من TMDB - نسخة فائقة السرعة            ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
  
  const startTime = Date.now()
  
  // معالجة الأفلام
  const movies = mergeFile('./tmdb-exports/movie_ids_07_19_2026.json', 'movies')
  
  // معالجة المسلسلات
  const series = mergeFile('./tmdb-exports/tv_series_ids_07_19_2026.json', 'tv_series')
  
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  
  // الملخص
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║                    النتيجة النهائية                     ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
  
  console.log(`🎬 الأفلام:`)
  console.log(`   كان موجود: ${movies.existing.toLocaleString()}`)
  console.log(`   تمت إضافته: ${movies.added.toLocaleString()}`)
  console.log(`   الإجمالي: ${(movies.existing + movies.added).toLocaleString()}`)
  
  console.log(`\n📺 المسلسلات:`)
  console.log(`   كان موجود: ${series.existing.toLocaleString()}`)
  console.log(`   تمت إضافته: ${series.added.toLocaleString()}`)
  console.log(`   الإجمالي: ${(series.existing + series.added).toLocaleString()}`)
  
  console.log(`\n⏱️  الوقت الكلي: ${elapsed} دقيقة`)
  console.log(`\n✅ انتهى!\n`)
  
  db.close()
}

main().catch(error => {
  console.error('❌ خطأ:', error.message)
  db.close()
  process.exit(1)
})
