#!/usr/bin/env node
// ============================================
// 🔍 تشخيص TMDB API - ليه فشل؟
// ============================================
require('dotenv').config({ path: '.env.local' })
const https = require('https')

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN

console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║           🔍 تشخيص TMDB API - ليه فشل؟                    ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

// ============================================
// 1. Check API Keys
// ============================================

console.log('📋 المرحلة 1: فحص مفاتيح API\n')

console.log('  TMDB_API_KEY:', TMDB_API_KEY ? `✓ موجود (${TMDB_API_KEY.substring(0, 10)}...)` : '✗ مفقود')
console.log('  TMDB_READ_ACCESS_TOKEN:', TMDB_READ_ACCESS_TOKEN ? `✓ موجود (${TMDB_READ_ACCESS_TOKEN.substring(0, 20)}...)` : '✗ مفقود')
console.log('')

if (!TMDB_API_KEY && !TMDB_READ_ACCESS_TOKEN) {
  console.log('❌ لا يوجد مفاتيح API!\n')
  process.exit(1)
}

// ============================================
// 2. Test Different Methods
// ============================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🧪 المرحلة 2: اختبار طرق مختلفة للاتصال')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

// Method 1: Bearer Token (Authorization header)
function fetchWithBearer(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.themoviedb.org',
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TMDB_READ_ACCESS_TOKEN}`,
        'accept': 'application/json'
      }
    }

    console.log(`  🔹 Endpoint: https://api.themoviedb.org${endpoint}`)
    console.log(`  🔹 Method: Bearer Token`)
    console.log(`  🔹 Headers:`, JSON.stringify(options.headers, null, 2))
    console.log('')

    const req = https.get(options, (res) => {
      let data = ''
      
      console.log(`  📡 Response Status: ${res.statusCode}`)
      console.log(`  📡 Response Headers:`, JSON.stringify(res.headers, null, 2))
      console.log('')
      
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, data: parsed })
        } catch (e) {
          resolve({ status: res.statusCode, data, error: e.message })
        }
      })
    })

    req.on('error', (e) => {
      console.log(`  ❌ Request Error: ${e.message}\n`)
      reject(e)
    })

    req.setTimeout(10000, () => {
      console.log(`  ⏱️ Request Timeout!\n`)
      req.destroy()
      reject(new Error('Timeout'))
    })
  })
}

// Method 2: API Key in query string
function fetchWithApiKey(endpoint) {
  return new Promise((resolve, reject) => {
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullPath = `${endpoint}${separator}api_key=${TMDB_API_KEY}`
    
    const options = {
      hostname: 'api.themoviedb.org',
      path: fullPath,
      method: 'GET',
      headers: {
        'accept': 'application/json'
      }
    }

    console.log(`  🔹 Endpoint: https://api.themoviedb.org${fullPath.replace(TMDB_API_KEY, 'API_KEY_HIDDEN')}`)
    console.log(`  🔹 Method: API Key in query`)
    console.log('')

    const req = https.get(options, (res) => {
      let data = ''
      
      console.log(`  📡 Response Status: ${res.statusCode}`)
      console.log('')
      
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, data: parsed })
        } catch (e) {
          resolve({ status: res.statusCode, data, error: e.message })
        }
      })
    })

    req.on('error', (e) => {
      console.log(`  ❌ Request Error: ${e.message}\n`)
      reject(e)
    })

    req.setTimeout(10000, () => {
      console.log(`  ⏱️ Request Timeout!\n`)
      req.destroy()
      reject(new Error('Timeout'))
    })
  })
}

// ============================================
// 3. Test Cases
// ============================================

async function runTests() {
  const tests = [
    {
      name: '🎬 Wicked (2024) - ID: 402431',
      endpoints: [
        '/3/movie/402431',
        '/3/movie/402431?language=ar',
        '/3/movie/402431?language=en'
      ]
    },
    {
      name: '🎬 Gladiator II (2024) - ID: 558449',
      endpoints: [
        '/3/movie/558449',
        '/3/movie/558449?language=ar'
      ]
    },
    {
      name: '📺 House of the Dragon - ID: 94997',
      endpoints: [
        '/3/tv/94997',
        '/3/tv/94997?language=ar'
      ]
    }
  ]

  for (const test of tests) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`${test.name}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    for (const endpoint of test.endpoints) {
      console.log(`\n▶ اختبار: ${endpoint}\n`)
      
      // Try with Bearer Token
      try {
        console.log('┌─ Attempt 1: Bearer Token')
        const result = await fetchWithBearer(endpoint)
        
        if (result.status === 200) {
          console.log('  ✅ نجح! البيانات:')
          if (result.data.title) {
            console.log(`     العنوان: ${result.data.title}`)
            console.log(`     العنوان الأصلي: ${result.data.original_title}`)
            console.log(`     التاريخ: ${result.data.release_date}`)
            console.log(`     المدة: ${result.data.runtime} دقيقة`)
            console.log(`     التقييم: ${result.data.vote_average}`)
            console.log(`     الوصف: ${result.data.overview?.substring(0, 60)}...`)
          } else if (result.data.name) {
            console.log(`     الاسم: ${result.data.name}`)
            console.log(`     الاسم الأصلي: ${result.data.original_name}`)
            console.log(`     التاريخ: ${result.data.first_air_date}`)
            console.log(`     عدد المواسم: ${result.data.number_of_seasons}`)
            console.log(`     مدة الحلقة: ${result.data.episode_run_time}`)
            console.log(`     التقييم: ${result.data.vote_average}`)
          }
          console.log('')
        } else if (result.status === 404) {
          console.log(`  ⚠️ Not Found (404): الفيلم/المسلسل غير موجود`)
          console.log(`     Message: ${result.data.status_message || 'N/A'}`)
          console.log('')
        } else {
          console.log(`  ❌ فشل! Status: ${result.status}`)
          console.log(`     Response: ${JSON.stringify(result.data, null, 2)}`)
          console.log('')
        }
      } catch (e) {
        console.log(`  ❌ خطأ: ${e.message}\n`)
      }

      await new Promise(resolve => setTimeout(resolve, 300))

      // Try with API Key (if available)
      if (TMDB_API_KEY) {
        try {
          console.log('┌─ Attempt 2: API Key in Query')
          const result = await fetchWithApiKey(endpoint)
          
          if (result.status === 200) {
            console.log('  ✅ نجح! البيانات:')
            if (result.data.title) {
              console.log(`     العنوان: ${result.data.title}`)
            } else if (result.data.name) {
              console.log(`     الاسم: ${result.data.name}`)
            }
            console.log('')
          } else {
            console.log(`  ❌ فشل! Status: ${result.status}`)
            console.log('')
          }
        } catch (e) {
          console.log(`  ❌ خطأ: ${e.message}\n`)
        }

        await new Promise(resolve => setTimeout(resolve, 300))
      }

      console.log('└─────────────────────────────────────────\n')
    }
  }
}

// ============================================
// 4. Main Execution
// ============================================

async function main() {
  try {
    await runTests()

    console.log('\n\n╔════════════════════════════════════════════════════════════╗')
    console.log('║                    ✅ اكتمل التشخيص                       ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('📝 التحليل:')
    console.log('  • إذا كل الطلبات نجحت → السكريبت السابق فيه خطأ في الكود')
    console.log('  • إذا كل الطلبات فشلت → مشكلة في API Key أو Network')
    console.log('  • إذا بعضها نجح → مشكلة في Language parameter أو IDs')
    console.log('')

  } catch (error) {
    console.error('\n❌ خطأ:', error.message)
    console.error(error.stack)
  }
}

main()
