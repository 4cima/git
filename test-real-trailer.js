#!/usr/bin/env node
// Test specific movie with known trailer
require('dotenv').config({ path: '.env.local' })
const https = require('https')

const TMDB_API_KEY = process.env.TMDB_API_KEY

function fetchTMDB(endpoint) {
  return new Promise((resolve, reject) => {
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullPath = `${endpoint}${separator}api_key=${TMDB_API_KEY}`
    
    https.get({
      hostname: 'api.themoviedb.org',
      path: fullPath,
      headers: { 'accept': 'application/json' }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })
}

async function test() {
  console.log('\n🧪 اختبار أفلام معروفة:\n')
  
  const tests = [
    { id: 402431, name: 'Wicked (2024)', year: 2024 },
    { id: 558449, name: 'Gladiator II (2024)', year: 2024 },
    { id: 533535, name: 'Deadpool & Wolverine (2024)', year: 2024 },
    { id: 1368337, name: 'The Odyssey (2026)', year: 2026 }
  ]
  
  for (const test of tests) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`🎬 ${test.name}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
    
    try {
      const movie = await fetchTMDB(`/3/movie/${test.id}?language=ar&append_to_response=videos`)
      
      console.log(`📊 البيانات الأساسية:`)
      console.log(`   • العنوان: ${movie.title}`)
      console.log(`   • السنة: ${movie.release_date?.split('-')[0]}`)
      console.log(`   • التقييم: ${movie.vote_average}`)
      console.log('')
      
      if (movie.videos && movie.videos.results && movie.videos.results.length > 0) {
        console.log(`✅ التريلرات (${movie.videos.results.length} فيديو):`)
        movie.videos.results.forEach((v, i) => {
          console.log(`   ${i + 1}. ${v.type} - ${v.name}`)
          console.log(`      Site: ${v.site}`)
          console.log(`      Key: ${v.key}`)
          console.log(`      Link: https://www.youtube.com/watch?v=${v.key}`)
          console.log('')
        })
      } else {
        console.log(`❌ لا توجد تريلرات على TMDB`)
        console.log(`   السبب المحتمل: ${test.year >= 2026 ? 'فيلم مستقبلي' : 'فيلم قديم أو محذوف'}`)
      }
      
      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      console.log(`❌ خطأ: ${e.message}`)
    }
  }
}

test()
