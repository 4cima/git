#!/usr/bin/env node
/**
 * Test processSeries logic on tmdb_id=13 step by step
 */

require('dotenv').config({ path: '.env.local' })
const db = require('./scripts/services/local-db')
const { fetchSeriesDetails, fetchSeasonDetails } = require('./scripts/services/tmdb-api')
const { translateField } = require('./scripts/services/translation-service')
const { getFilterDetails } = require('./scripts/services/content-filter')
const { generateUniqueSlug } = require('./scripts/services/slug-generator')
const { getGenreNameAr } = require('./scripts/services/genre-translations')

const tmdbId = 13

async function test() {
  console.log('═══════════════════════════════════════════')
  console.log(`🧪 اختبار معالجة المسلسل tmdb_id=${tmdbId}`)
  console.log('═══════════════════════════════════════════\n')
  
  try {
    // Step 1: Fetch
    console.log('خطوة 1: السحب من TMDB...')
    const series = await fetchSeriesDetails(tmdbId)
    
    if (!series) {
      console.log('❌ series = null')
      return
    }
    
    console.log(`✅ series.name = "${series.name}"`)
    console.log(`✅ series.number_of_seasons = ${series.number_of_seasons}`)
    
    // Step 2: Filter check
    console.log('\nخطوة 2: التحقق من الفلترة...')
    const filterDetails = getFilterDetails(series)
    console.log(`filterDetails.blocked = ${filterDetails.blocked}`)
    
    if (filterDetails.blocked) {
      console.log(`⚠️ المسلسل مفلتر: ${filterDetails.reason}`)
      console.log(`needsReview = ${filterDetails.needsReview}`)
      return
    }
    
    console.log('✅ المسلسل نضيف (غير مفلتر)')
    
    // Step 3: Translation
    console.log('\nخطوة 3: الترجمة...')
    const name_en = series.name || series.original_name
    console.log(`name_en = "${name_en}"`)
    
    const name_ar = await translateField(name_en, series.translations?.translations, 'name')
    console.log(`name_ar = "${name_ar || '(null)'}"`)
    
    const overview_ar = await translateField(series.overview, series.translations?.translations, 'overview')
    console.log(`overview_ar = ${overview_ar ? overview_ar.length + ' حرف' : '(null)'}`)
    
    const isComplete = name_ar ? 1 : 0
    console.log(`isComplete = ${isComplete}`)
    
    // Step 4: Seasons
    console.log('\nخطوة 4: سحب المواسم...')
    const validSeasons = (series.seasons || []).filter(s => s.season_number >= 0)
    console.log(`عدد المواسم الصالحة: ${validSeasons.length}`)
    
    let seasonsFetched = 0
    for (const meta of validSeasons.slice(0, 2)) { // first 2 only for speed
      console.log(`  جاري سحب الموسم ${meta.season_number}...`)
      const details = await fetchSeasonDetails(tmdbId, meta.season_number)
      if (details) {
        seasonsFetched++
        console.log(`    ✅ ${details.episodes?.length || 0} حلقة`)
      } else {
        console.log(`    ❌ فشل`)
      }
    }
    
    console.log(`\n✅ تم سحب ${seasonsFetched} موسم بنجاح`)
    
    // Step 5: Try INSERT
    console.log('\nخطوة 5: محاولة INSERT في قاعدة البيانات...')
    
    const first_air_year = series.first_air_date ? parseInt(series.first_air_date.split('-')[0], 10) : null
    const primary_genre = series.genres?.[0]?.name?.toLowerCase() || null
    const slug = generateUniqueSlug(db, name_en, first_air_year, primary_genre, 'tv_series')
    
    console.log(`slug = "${slug}"`)
    
    try {
      db.prepare(`
        UPDATE tv_series 
        SET name_en = ?, name_ar = ?, is_fetched = 1, is_complete = ?, updated_at = datetime('now')
        WHERE tmdb_id = ?
      `).run(name_en, name_ar, isComplete, tmdbId)
      
      console.log('✅ UPDATE نجح!')
      
      // Verify
      const updated = db.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(tmdbId)
      console.log('\n📊 البيانات بعد UPDATE:')
      console.log(`  tmdb_id: ${updated.tmdb_id}`)
      console.log(`  name_en: ${updated.name_en}`)
      console.log(`  name_ar: ${updated.name_ar}`)
      console.log(`  is_fetched: ${updated.is_fetched}`)
      console.log(`  is_complete: ${updated.is_complete}`)
      
    } catch (dbErr) {
      console.log('❌ خطأ في UPDATE:', dbErr.message)
    }
    
  } catch (err) {
    console.log('\n❌ خطأ عام:')
    console.log(`Message: ${err.message}`)
    console.log(`Stack: ${err.stack}`)
  }
  
  console.log('\n═══════════════════════════════════════════')
  console.log('✅ انتهى الاختبار')
  console.log('═══════════════════════════════════════════')
}

test().catch(err => {
  console.error('❌ خطأ فادح:', err)
  process.exit(1)
})
