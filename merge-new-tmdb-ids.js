// دمج IDs الجديدة من TMDB مع القاعدة المحلية
const Database = require('better-sqlite3')
const fs = require('fs')
const readline = require('readline')

const db = new Database('./data/4cima-local.db')

console.log('\n╔══════════════════════════════════════════════════════════════╗')
console.log('║         دمج IDs الجديدة من TMDB مع القاعدة المحلية          ║')
console.log('╚══════════════════════════════════════════════════════════════╝\n')

// الإحصائيات
const stats = {
  movies: { existing: 0, new: 0, skipped: 0 },
  series: { existing: 0, new: 0, skipped: 0 }
}

// قراءة ملف JSON سطر بسطر
async function processFile(filePath, table, idColumn = 'id') {
  console.log(`\n📂 معالجة: ${filePath}`)
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  الملف غير موجود!`)
    return
  }
  
  const contentType = table === 'movies' ? 'movie' : 'series'
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })
  
  // تحضير الاستعلامات
  const checkStmt = db.prepare(`SELECT id FROM ${table} WHERE id = ?`)
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO ${table} (
      id, tmdb_id, slug, 
      ${table === 'movies' ? 'title_ar, title_en' : 'name_ar, name_en'},
      source
    ) VALUES (?, ?, ?, ?, ?, 'tmdb')
  `)
  
  let lineNum = 0
  const batchSize = 1000
  let batch = []
  
  for await (const line of rl) {
    lineNum++
    
    try {
      const record = JSON.parse(line)
      const id = record.id
      
      // تخطي المحتوى الإباحي
      if (record.adult === true) {
        stats[contentType].skipped++
        continue
      }
      
      // تحقق إذا كان موجود
      const exists = checkStmt.get(id)
      if (exists) {
        stats[contentType].existing++
      } else {
        batch.push({
          id,
          slug: `temp-${id}`,
          title: record.title || record.name || `Item ${id}`
        })
        
        if (batch.length >= batchSize) {
          // إدخال الدفعة
          const transaction = db.transaction((items) => {
            for (const item of items) {
              insertStmt.run(
                item.id, item.id, item.slug,
                'TBD', item.title
              )
            }
          })
          
          transaction(batch)
          stats[contentType].new += batch.length
          batch = []
        }
      }
      
      // تقرير التقدم
      if (lineNum % 50000 === 0) {
        console.log(`   ... ${lineNum.toLocaleString()} سطر | جديد: ${stats[contentType].new.toLocaleString()} | موجود: ${stats[contentType].existing.toLocaleString()}`)
      }
      
    } catch (e) {
      // تجاهل الأسطر التالفة
      continue
    }
  }
  
  // إدخال الدفعة الأخيرة
  if (batch.length > 0) {
    const transaction = db.transaction((items) => {
      for (const item of items) {
        insertStmt.run(
          item.id, item.id, item.slug,
          'TBD', item.title
        )
      }
    })
    
    transaction(batch)
    stats[contentType].new += batch.length
  }
  
  console.log(`   ✅ انتهى: ${lineNum.toLocaleString()} سطر`)
  console.log(`      • جديد: ${stats[contentType].new.toLocaleString()}`)
  console.log(`      • موجود: ${stats[contentType].existing.toLocaleString()}`)
  console.log(`      • متخطى (adult): ${stats[contentType].skipped.toLocaleString()}`)
}

async function main() {
  const startTime = Date.now()
  
  // معالجة الأفلام
  await processFile('./tmdb-exports/movie_ids_07_19_2026.json', 'movies')
  
  // معالجة المسلسلات
  await processFile('./tmdb-exports/tv_series_ids_07_19_2026.json', 'tv_series')
  
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  
  // الملخص النهائي
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║                        الملخص النهائي                        ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  
  console.log(`\n🎬 الأفلام:`)
  console.log(`   • كان موجود: ${stats.movies.existing.toLocaleString()}`)
  console.log(`   • تمت إضافته: ${stats.movies.new.toLocaleString()}`)
  console.log(`   • متخطى (adult): ${stats.movies.skipped.toLocaleString()}`)
  console.log(`   • الإجمالي الآن: ${(stats.movies.existing + stats.movies.new).toLocaleString()}`)
  
  console.log(`\n📺 المسلسلات:`)
  console.log(`   • كان موجود: ${stats.series.existing.toLocaleString()}`)
  console.log(`   • تمت إضافته: ${stats.series.new.toLocaleString()}`)
  console.log(`   • متخطى (adult): ${stats.series.skipped.toLocaleString()}`)
  console.log(`   • الإجمالي الآن: ${(stats.series.existing + stats.series.new).toLocaleString()}`)
  
  console.log(`\n⏱️  الوقت: ${elapsed} دقيقة`)
  
  console.log(`\n💡 الخطوة التالية:`)
  console.log(`   شغّل سكريبتات السحب لملء البيانات:`)
  console.log(`   • node scripts/INGEST-MOVIES-LOGIC.js`)
  console.log(`   • node scripts/INGEST-SERIES-LOGIC.js`)
  
  console.log('\n')
  db.close()
}

main().catch(error => {
  console.error('❌ خطأ:', error)
  db.close()
  process.exit(1)
})
