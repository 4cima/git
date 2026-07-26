// ============================================
// 📥 سحب كل IDs من TVMaze
// ============================================
const fs = require('fs')
const path = require('path')

const stats = { fetched: 0, errors: 0, start: Date.now() }

async function fetchPage(page) {
  try {
    const response = await fetch(`https://api.tvmaze.com/shows?page=${page}`)
    
    if (response.status === 404) {
      return null // لا توجد صفحات أخرى
    }
    
    if (!response.ok) {
      console.log(`❌ خطأ في الصفحة ${page}: ${response.status}`)
      return null
    }
    
    return response.json()
  } catch (e) {
    console.error(`❌ خطأ في الصفحة ${page}:`, e.message)
    stats.errors++
    return null
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('📥 سحب كل IDs من TVMaze')
  console.log('='.repeat(80))
  console.log('')
  
  const allShows = []
  let page = 0
  
  while (true) {
    const shows = await fetchPage(page)
    
    if (!shows || shows.length === 0) {
      console.log(`\n✅ انتهى السحب عند الصفحة ${page}`)
      break
    }
    
    allShows.push(...shows)
    stats.fetched += shows.length
    
    if (page % 10 === 0) {
      const elapsed = (Date.now() - stats.start) / 60000
      const rate = (stats.fetched / elapsed).toFixed(0)
      console.log(`⏳ صفحة ${page} | ${stats.fetched.toLocaleString()} مسلسل | ${rate}/دقيقة`)
    }
    
    page++
    
    // تأخير صغير لتجنب rate limiting
    await new Promise(r => setTimeout(r, 100))
  }
  
  // حفظ النتائج
  const dataDir = path.join(__dirname, '..', 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  const today = new Date()
  const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}_${String(today.getDate()).padStart(2, '0')}_${today.getFullYear()}`
  const outputPath = path.join(dataDir, `tvmaze_shows_${dateStr}.json`)
  
  // حفظ كل سطر منفصل (مثل TMDB)
  const lines = allShows.map(show => JSON.stringify({
    id: show.id,
    name: show.name,
    type: show.type,
    language: show.language,
    genres: show.genres,
    status: show.status,
    premiered: show.premiered,
    rating: show.rating?.average || null
  })).join('\n')
  
  fs.writeFileSync(outputPath, lines)
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 الملخص')
  console.log('='.repeat(80))
  console.log(`✅ مسحوب: ${stats.fetched.toLocaleString()} مسلسل`)
  console.log(`❌ أخطاء: ${stats.errors}`)
  console.log(`⏱️ الوقت: ${((Date.now() - stats.start) / 60000).toFixed(1)} دقيقة`)
  console.log(`📁 الملف: ${outputPath}`)
  console.log('='.repeat(80))
}

main().catch(console.error)
