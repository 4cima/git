#!/usr/bin/env node
/**
 * Debug script: Test fetching a single series from TMDB API
 * Purpose: Diagnose why 1-fetch-and-enrich.js returns 0 series
 */

require('dotenv').config({ path: '.env.local' })

console.log('═══════════════════════════════════════════')
console.log('🔍 تشخيص سحب مسلسل واحد من TMDB')
console.log('═══════════════════════════════════════════\n')

// Test 1: Check if TMDB API key exists
console.log('📋 خطوة 1: التحقق من TMDB API Key')
const apiKey = process.env.TMDB_API_KEY
if (!apiKey) {
  console.log('❌ TMDB_API_KEY غير موجود في .env.local!')
  process.exit(1)
}
console.log(`✅ TMDB_API_KEY موجود: ${apiKey.substring(0, 8)}...`)

// Test 2: Try fetching series directly
console.log('\n📋 خطوة 2: محاولة سحب tmdb_id=13 من TMDB API مباشرة')

const tmdbId = 13

async function testFetch() {
  try {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&append_to_response=translations,content_ratings,credits,videos,seasons`
    
    console.log(`🌐 URL: ${url.replace(apiKey, '***')}`)
    console.log('⏳ جاري الطلب...\n')
    
    const fetch = (await import('node-fetch')).default
    const response = await fetch(url)
    
    console.log(`📊 Status Code: ${response.status}`)
    console.log(`📊 Status Text: ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('\n❌ الطلب فشل!')
      console.log('📄 Response Body:')
      console.log(errorText)
      return
    }
    
    const data = await response.json()
    
    console.log('\n✅ الطلب نجح!')
    console.log('═══════════════════════════════════════════')
    console.log('📊 بيانات المسلسل:')
    console.log('═══════════════════════════════════════════')
    console.log(`ID: ${data.id}`)
    console.log(`Name: ${data.name}`)
    console.log(`Original Name: ${data.original_name}`)
    console.log(`First Air Date: ${data.first_air_date}`)
    console.log(`Number of Seasons: ${data.number_of_seasons}`)
    console.log(`Number of Episodes: ${data.number_of_episodes}`)
    console.log(`Status: ${data.status}`)
    console.log(`Overview: ${data.overview?.substring(0, 100)}...`)
    
    console.log('\n📊 Translations:')
    if (data.translations?.translations) {
      const ar = data.translations.translations.find(t => t.iso_639_1 === 'ar')
      if (ar) {
        console.log(`  Arabic Title: ${ar.data?.name || '(none)'}`)
        console.log(`  Arabic Overview: ${ar.data?.overview?.substring(0, 100) || '(none)'}...`)
      } else {
        console.log('  ⚠️ لا توجد ترجمة عربية')
      }
    }
    
    console.log('\n📊 Genres:')
    if (data.genres && data.genres.length > 0) {
      data.genres.forEach(g => console.log(`  - ${g.id}: ${g.name}`))
    } else {
      console.log('  ⚠️ لا توجد تصنيفات')
    }
    
  } catch (error) {
    console.log('\n❌ خطأ في الطلب:')
    console.log(`Type: ${error.constructor.name}`)
    console.log(`Message: ${error.message}`)
    console.log(`Stack: ${error.stack}`)
  }
}

// Test 3: Try using the actual script function
console.log('\n═══════════════════════════════════════════')
console.log('📋 خطوة 3: محاولة استخدام دالة السكريبت الفعلية')
console.log('═══════════════════════════════════════════\n')

async function testScriptFunction() {
  try {
    const { fetchSeriesDetails } = require('./scripts/services/tmdb-api')
    
    console.log('⏳ جاري استدعاء fetchSeriesDetails(13)...\n')
    
    const result = await fetchSeriesDetails(13)
    
    if (!result) {
      console.log('❌ النتيجة: null (السكريبت رجع null)')
      console.log('   المعنى: المسلسل غير موجود في TMDB أو حصل خطأ')
    } else {
      console.log('✅ النتيجة: نجح!')
      console.log(`   Name: ${result.name}`)
      console.log(`   Seasons: ${result.number_of_seasons}`)
    }
    
  } catch (error) {
    console.log('❌ خطأ في استدعاء fetchSeriesDetails:')
    console.log(`Message: ${error.message}`)
    console.log(`Stack: ${error.stack}`)
  }
}

// Run tests
async function main() {
  await testFetch()
  await testScriptFunction()
  
  console.log('\n═══════════════════════════════════════════')
  console.log('✅ انتهى التشخيص')
  console.log('═══════════════════════════════════════════')
}

main().catch(err => {
  console.error('❌ خطأ فادح:', err)
  process.exit(1)
})
