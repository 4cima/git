// تنزيل ملفات IDs من TMDB Daily Export
const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const zlib = require('zlib')
const { pipeline } = require('stream/promises')

console.log('\n╔══════════════════════════════════════════════════════════════╗')
console.log('║           تنزيل ملفات IDs من TMDB Daily Export             ║')
console.log('╚══════════════════════════════════════════════════════════════╝\n')

// إنشاء مجلد للملفات
const dataDir = './tmdb-exports'
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
  console.log(`✅ تم إنشاء مجلد: ${dataDir}\n`)
}

// الحصول على تاريخ اليوم بصيغة MM_DD_YYYY
function getTodayDate() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const year = today.getFullYear()
  return `${month}_${day}_${year}`
}

// تنزيل ملف
async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 جاري التنزيل من: ${url}`)
    
    const protocol = url.startsWith('https') ? https : http
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // إعادة توجيه
        return downloadFile(response.headers.location, outputPath).then(resolve).catch(reject)
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`فشل التنزيل: ${response.statusCode} ${response.statusMessage}`))
        return
      }
      
      const fileStream = fs.createWriteStream(outputPath)
      let downloadedSize = 0
      const totalSize = parseInt(response.headers['content-length'], 10)
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length
        const progress = ((downloadedSize / totalSize) * 100).toFixed(1)
        process.stdout.write(`\r   التقدم: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`)
      })
      
      response.pipe(fileStream)
      
      fileStream.on('finish', () => {
        fileStream.close()
        console.log('\n   ✅ تم التنزيل بنجاح')
        resolve(outputPath)
      })
      
      fileStream.on('error', (err) => {
        fs.unlink(outputPath, () => {})
        reject(err)
      })
    }).on('error', reject)
  })
}

// فك ضغط ملف .gz
async function decompressGzip(inputPath, outputPath) {
  console.log(`\n📦 فك الضغط: ${path.basename(inputPath)}`)
  
  const input = fs.createReadStream(inputPath)
  const output = fs.createWriteStream(outputPath)
  const gunzip = zlib.createGunzip()
  
  await pipeline(input, gunzip, output)
  
  console.log(`   ✅ تم فك الضغط: ${path.basename(outputPath)}`)
  
  // حذف ملف .gz
  fs.unlinkSync(inputPath)
  console.log(`   🗑️  تم حذف الملف المضغوط`)
}

// تحليل ملف JSON وعرض إحصائيات
function analyzeJsonFile(filePath, type) {
  console.log(`\n📊 تحليل ملف ${type}...\n`)
  
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.trim().split('\n')
  
  console.log(`   إجمالي السجلات: ${lines.length.toLocaleString()}`)
  
  // عينة من أول 5 سجلات
  console.log(`\n   عينة من البيانات:`)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    try {
      const record = JSON.parse(lines[i])
      console.log(`   ${i + 1}. ID: ${record.id}, Adult: ${record.adult}, Popularity: ${record.popularity?.toFixed(2) || 'N/A'}`)
    } catch (e) {
      console.log(`   ${i + 1}. خطأ في القراءة`)
    }
  }
  
  // إحصائيات
  let adultCount = 0
  let highPopularity = 0
  
  console.log(`\n   جاري تحليل البيانات...`)
  
  for (let i = 0; i < lines.length; i++) {
    try {
      const record = JSON.parse(lines[i])
      if (record.adult) adultCount++
      if (record.popularity && record.popularity >= 10) highPopularity++
      
      if (i % 100000 === 0) {
        process.stdout.write(`\r   التقدم: ${((i / lines.length) * 100).toFixed(1)}%`)
      }
    } catch (e) {
      // تجاهل الأسطر التالفة
    }
  }
  
  console.log(`\r   التقدم: 100.0%`)
  
  console.log(`\n   📈 الإحصائيات:`)
  console.log(`      • إجمالي: ${lines.length.toLocaleString()}`)
  console.log(`      • Adult: ${adultCount.toLocaleString()} (${((adultCount/lines.length)*100).toFixed(1)}%)`)
  console.log(`      • Clean: ${(lines.length - adultCount).toLocaleString()} (${(((lines.length - adultCount)/lines.length)*100).toFixed(1)}%)`)
  console.log(`      • شعبية عالية (>=10): ${highPopularity.toLocaleString()} (${((highPopularity/lines.length)*100).toFixed(1)}%)`)
  
  return {
    total: lines.length,
    adult: adultCount,
    clean: lines.length - adultCount,
    highPopularity
  }
}

// الدالة الرئيسية
async function main() {
  const date = getTodayDate()
  
  console.log(`📅 التاريخ: ${date}\n`)
  
  const files = [
    {
      name: 'movie_ids',
      url: `http://files.tmdb.org/p/exports/movie_ids_${date}.json.gz`,
      type: 'أفلام'
    },
    {
      name: 'tv_series_ids',
      url: `http://files.tmdb.org/p/exports/tv_series_ids_${date}.json.gz`,
      type: 'مسلسلات'
    }
  ]
  
  const results = {}
  
  for (const file of files) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`📺 ${file.type}`)
    console.log('='.repeat(70))
    
    const gzPath = path.join(dataDir, `${file.name}_${date}.json.gz`)
    const jsonPath = path.join(dataDir, `${file.name}_${date}.json`)
    
    try {
      // تحقق إذا كان الملف موجود بالفعل
      if (fs.existsSync(jsonPath)) {
        console.log(`\n✅ الملف موجود بالفعل: ${path.basename(jsonPath)}`)
        console.log(`   تخطي التنزيل...`)
      } else {
        // تنزيل
        await downloadFile(file.url, gzPath)
        
        // فك الضغط
        await decompressGzip(gzPath, jsonPath)
      }
      
      // تحليل
      const stats = analyzeJsonFile(jsonPath, file.type)
      results[file.name] = stats
      
    } catch (error) {
      console.error(`\n❌ خطأ في معالجة ${file.type}:`, error.message)
      
      // محاولة تاريخ الأمس
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayDate = `${String(yesterday.getMonth() + 1).padStart(2, '0')}_${String(yesterday.getDate()).padStart(2, '0')}_${yesterday.getFullYear()}`
      
      console.log(`\n🔄 محاولة تاريخ الأمس: ${yesterdayDate}`)
      
      const altUrl = file.url.replace(date, yesterdayDate)
      const altGzPath = path.join(dataDir, `${file.name}_${yesterdayDate}.json.gz`)
      const altJsonPath = path.join(dataDir, `${file.name}_${yesterdayDate}.json`)
      
      try {
        if (fs.existsSync(altJsonPath)) {
          console.log(`✅ الملف موجود: ${path.basename(altJsonPath)}`)
          const stats = analyzeJsonFile(altJsonPath, file.type)
          results[file.name] = stats
        } else {
          await downloadFile(altUrl, altGzPath)
          await decompressGzip(altGzPath, altJsonPath)
          const stats = analyzeJsonFile(altJsonPath, file.type)
          results[file.name] = stats
        }
      } catch (err) {
        console.error(`❌ فشل تنزيل تاريخ الأمس أيضاً:`, err.message)
      }
    }
  }
  
  // الملخص النهائي
  console.log(`\n\n${'='.repeat(70)}`)
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║                      الملخص النهائي                         ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  
  if (results.movie_ids) {
    console.log('\n🎬 الأفلام:')
    console.log(`   • إجمالي: ${results.movie_ids.total.toLocaleString()}`)
    console.log(`   • نظيف (بدون Adult): ${results.movie_ids.clean.toLocaleString()}`)
    console.log(`   • شعبية عالية: ${results.movie_ids.highPopularity.toLocaleString()}`)
  }
  
  if (results.tv_series_ids) {
    console.log('\n📺 المسلسلات:')
    console.log(`   • إجمالي: ${results.tv_series_ids.total.toLocaleString()}`)
    console.log(`   • نظيف (بدون Adult): ${results.tv_series_ids.clean.toLocaleString()}`)
    console.log(`   • شعبية عالية: ${results.tv_series_ids.highPopularity.toLocaleString()}`)
  }
  
  console.log('\n📁 الملفات المحفوظة في: ' + path.resolve(dataDir))
  
  console.log('\n💡 الخطوة التالية:')
  console.log('   1. راجع الملفات في مجلد tmdb-exports/')
  console.log('   2. استخدم import-tmdb-ids.js لإدخال IDs في القاعدة المحلية')
  console.log('   3. أو استخدم filter-tmdb-ids.js لفلترة IDs حسب الشعبية/السنة')
  
  console.log('\n')
}

main().catch(error => {
  console.error('\n❌ خطأ عام:', error)
  process.exit(1)
})
