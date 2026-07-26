// ============================================
// 📥 تنزيل ملفات TMDB Daily Exports
// ============================================
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { pipeline } = require('stream/promises')

// تاريخ اليوم بصيغة MM_DD_YYYY
const today = new Date()
const month = String(today.getMonth() + 1).padStart(2, '0')
const day = String(today.getDate()).padStart(2, '0')
const year = today.getFullYear()
const dateStr = `${month}_${day}_${year}`

console.log(`📅 التاريخ: ${dateStr}\n`)

const files = [
  { name: 'movie_ids', url: `https://files.tmdb.org/p/exports/movie_ids_${dateStr}.json.gz` },
  { name: 'tv_series_ids', url: `https://files.tmdb.org/p/exports/tv_series_ids_${dateStr}.json.gz` },
  { name: 'person_ids', url: `https://files.tmdb.org/p/exports/person_ids_${dateStr}.json.gz` },
]

async function downloadAndExtract(file) {
  console.log(`📥 تنزيل: ${file.name}...`)
  
  try {
    const response = await fetch(file.url)
    
    if (!response.ok) {
      console.log(`❌ فشل: ${response.status} - ${file.name}`)
      return
    }
    
    const outputPath = path.join(__dirname, '..', 'data', `${file.name}_${dateStr}.json`)
    const gzPath = path.join(__dirname, '..', 'data', `${file.name}_${dateStr}.json.gz`)
    
    // حفظ الملف المضغوط
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(gzPath, buffer)
    
    console.log(`✅ تم التنزيل: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
    console.log(`📦 فك الضغط...`)
    
    // فك الضغط
    const gunzip = zlib.createGunzip()
    const source = fs.createReadStream(gzPath)
    const destination = fs.createWriteStream(outputPath)
    
    await pipeline(source, gunzip, destination)
    
    // حساب عدد الأسطر (IDs)
    const content = fs.readFileSync(outputPath, 'utf8')
    const lines = content.trim().split('\n').length
    
    console.log(`✅ تم فك الضغط: ${lines.toLocaleString()} ID`)
    console.log(`📁 الملف: ${outputPath}\n`)
    
    // حذف الملف المضغوط
    fs.unlinkSync(gzPath)
    
    return { name: file.name, count: lines, path: outputPath }
    
  } catch (e) {
    console.error(`❌ خطأ في ${file.name}:`, e.message)
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('📥 تنزيل TMDB Daily Exports')
  console.log('='.repeat(80))
  console.log('')
  
  // إنشاء مجلد data إذا لم يكن موجود
  const dataDir = path.join(__dirname, '..', 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  const results = []
  
  for (const file of files) {
    const result = await downloadAndExtract(file)
    if (result) results.push(result)
  }
  
  console.log('='.repeat(80))
  console.log('📊 الملخص')
  console.log('='.repeat(80))
  results.forEach(r => {
    console.log(`${r.name}: ${r.count.toLocaleString()} ID`)
  })
  console.log('='.repeat(80))
}

main().catch(console.error)
