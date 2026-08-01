#!/usr/bin/env node
// ============================================
// 🔍 مقارنة بيانات 3 مصادر
// ============================================
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const https = require('https')

const TMDB_API_KEY = process.env.TMDB_API_KEY

console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║       🔍 مقارنة شاملة: Turso vs Local vs TMDB API        ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

// ============================================
// 1. الاتصال بالمصادر
// ============================================

console.log('📡 المرحلة 1: الاتصال بالمصادر الثلاثة\n')

// Turso (Cloud)
let turso
try {
  turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
  console.log('  ✓ Turso: متصل')
} catch (e) {
  console.log('  ✗ Turso: فشل الاتصال:', e.message)
  process.exit(1)
}

// Local SQLite
let localDb
try {
  localDb = new Database('./data/4cima-local.db', { readonly: true })
  console.log('  ✓ Local SQLite: متصل')
} catch (e) {
  console.log('  ✗ Local SQLite: فشل الاتصال:', e.message)
  console.log('  ℹ القاعدة المحلية غير موجودة - سيتم التخطي')
  localDb = null
}

// TMDB API
if (!TMDB_API_KEY) {
  console.log('  ✗ TMDB API: مفتاح الـ API غير موجود')
  process.exit(1)
}
console.log('  ✓ TMDB API: جاهز\n')

// ============================================
// 2. Helper Functions
// ============================================

// Fetch from TMDB
function fetchTMDB(endpoint) {
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

    https.get(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

// Compare field
function compareField(label, tursoVal, localVal, tmdbVal) {
  const t = tursoVal !== null && tursoVal !== undefined ? String(tursoVal) : '❌ NULL'
  const l = localVal !== null && localVal !== undefined ? String(localVal) : '❌ NULL'
  const m = tmdbVal !== null && tmdbVal !== undefined ? String(tmdbVal) : '❌ NULL'
  
  // Truncate long values
  const maxLen = 50
  const tDisplay = t.length > maxLen ? t.substring(0, maxLen) + '...' : t
  const lDisplay = l.length > maxLen ? l.substring(0, maxLen) + '...' : l
  const mDisplay = m.length > maxLen ? m.substring(0, maxLen) + '...' : m
  
  // Check consistency
  const allSame = t === l && l === m
  const icon = allSame ? '✅' : '⚠️'
  
  console.log(`    ${icon} ${label}:`)
  console.log(`       Turso: ${tDisplay}`)
  if (localDb) console.log(`       Local: ${lDisplay}`)
  console.log(`       TMDB:  ${mDisplay}`)
  console.log('')
}

// ============================================
// 3. Sample Movies
// ============================================

async function analyzeMovies() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎬 تحليل الأفلام (عينة 10)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Get 10 random movies from Turso
  const tursoMovies = await turso.execute(`
    SELECT tmdb_id, title_ar, title_en, slug, 
           release_year, runtime, vote_average, 
           poster_path, backdrop_path, trailer_key,
           genres_json, cast_json, overview_ar
    FROM movies 
    ORDER BY popularity DESC 
    LIMIT 10
  `)

  for (let i = 0; i < tursoMovies.rows.length; i++) {
    const movie = tursoMovies.rows[i]
    console.log(`\n[$${i + 1}/10] 🎬 ${movie.title_ar || movie.title_en}`)
    console.log(`  TMDB ID: ${movie.tmdb_id}`)
    console.log(`  Slug: ${movie.slug}`)
    console.log('')

    // Local data
    let localMovie = null
    if (localDb) {
      try {
        localMovie = localDb.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(movie.tmdb_id)
      } catch (e) {
        console.log(`  ⚠️ Local: لم يتم العثور على البيانات\n`)
      }
    }

    // TMDB data
    let tmdbMovie = null
    try {
      tmdbMovie = await fetchTMDB(`/3/movie/${movie.tmdb_id}?language=ar`)
      await new Promise(resolve => setTimeout(resolve, 250)) // Rate limit
    } catch (e) {
      console.log(`  ⚠️ TMDB API: فشل جلب البيانات - ${e.message}\n`)
    }

    // Compare key fields
    console.log('  📊 المقارنة:\n')
    
    compareField('العنوان العربي', movie.title_ar, localMovie?.title_ar, tmdbMovie?.title)
    compareField('العنوان الإنجليزي', movie.title_en, localMovie?.title_en, tmdbMovie?.original_title)
    compareField('سنة الإصدار', movie.release_year, localMovie?.release_year, tmdbMovie?.release_date?.split('-')[0])
    compareField('المدة (دقيقة)', movie.runtime, localMovie?.runtime, tmdbMovie?.runtime)
    compareField('التقييم', movie.vote_average, localMovie?.vote_average, tmdbMovie?.vote_average)
    compareField('البوستر', movie.poster_path ? '✓ موجود' : '✗ مفقود', 
                 localMovie?.poster_path ? '✓ موجود' : '✗ مفقود',
                 tmdbMovie?.poster_path ? '✓ موجود' : '✗ مفقود')
    compareField('الباكدروب', movie.backdrop_path ? '✓ موجود' : '✗ مفقود',
                 localMovie?.backdrop_path ? '✓ موجود' : '✗ مفقود',
                 tmdbMovie?.backdrop_path ? '✓ موجود' : '✗ مفقود')
    compareField('التريلر', movie.trailer_key ? '✓ موجود' : '✗ مفقود',
                 localMovie?.trailer_key ? '✓ موجود' : '✗ مفقود',
                 tmdbMovie?.videos?.results?.[0]?.key ? '✓ موجود' : '✗ مفقود')
    compareField('الوصف', movie.overview_ar ? `${String(movie.overview_ar).substring(0, 40)}...` : '✗ مفقود',
                 localMovie?.overview_ar ? `${String(localMovie.overview_ar).substring(0, 40)}...` : '✗ مفقود',
                 tmdbMovie?.overview ? `${tmdbMovie.overview.substring(0, 40)}...` : '✗ مفقود')
    
    console.log('  ─────────────────────────────────────────')
  }
}

// ============================================
// 4. Sample Series
// ============================================

async function analyzeSeries() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📺 تحليل المسلسلات (عينة 10)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Get 10 random series from Turso
  const tursoSeries = await turso.execute(`
    SELECT tmdb_id, name_ar, name_en, slug,
           first_air_year, vote_average,
           poster_path, backdrop_path, trailer_key,
           number_of_seasons, number_of_episodes,
           genres_json, cast_json, overview_ar
    FROM tv_series 
    ORDER BY popularity DESC 
    LIMIT 10
  `)

  for (let i = 0; i < tursoSeries.rows.length; i++) {
    const series = tursoSeries.rows[i]
    console.log(`\n[${i + 1}/10] 📺 ${series.name_ar || series.name_en}`)
    console.log(`  TMDB ID: ${series.tmdb_id}`)
    console.log(`  Slug: ${series.slug}`)
    console.log('')

    // Local data
    let localSeries = null
    if (localDb) {
      try {
        localSeries = localDb.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(series.tmdb_id)
      } catch (e) {
        console.log(`  ⚠️ Local: لم يتم العثور على البيانات\n`)
      }
    }

    // TMDB data
    let tmdbSeries = null
    try {
      tmdbSeries = await fetchTMDB(`/3/tv/${series.tmdb_id}?language=ar`)
      await new Promise(resolve => setTimeout(resolve, 250)) // Rate limit
    } catch (e) {
      console.log(`  ⚠️ TMDB API: فشل جلب البيانات - ${e.message}\n`)
    }

    // Compare key fields
    console.log('  📊 المقارنة:\n')
    
    compareField('الاسم العربي', series.name_ar, localSeries?.name_ar, tmdbSeries?.name)
    compareField('الاسم الإنجليزي', series.name_en, localSeries?.name_en, tmdbSeries?.original_name)
    compareField('سنة البداية', series.first_air_year, localSeries?.first_air_year, tmdbSeries?.first_air_date?.split('-')[0])
    compareField('التقييم', series.vote_average, localSeries?.vote_average, tmdbSeries?.vote_average)
    compareField('عدد المواسم', series.number_of_seasons, localSeries?.number_of_seasons, tmdbSeries?.number_of_seasons)
    compareField('عدد الحلقات', series.number_of_episodes, localSeries?.number_of_episodes, tmdbSeries?.number_of_episodes)
    compareField('مدة الحلقة', '❓ تحقق يدوي', 
                 localSeries?.episode_run_time || '❌ NULL',
                 tmdbSeries?.episode_run_time?.[0] ? `${tmdbSeries.episode_run_time[0]}د` : '❌ NULL')
    compareField('البوستر', series.poster_path ? '✓ موجود' : '✗ مفقود',
                 localSeries?.poster_path ? '✓ موجود' : '✗ مفقود',
                 tmdbSeries?.poster_path ? '✓ موجود' : '✗ مفقود')
    compareField('الباكدروب', series.backdrop_path ? '✓ موجود' : '✗ مفقود',
                 localSeries?.backdrop_path ? '✓ موجود' : '✗ مفقود',
                 tmdbSeries?.backdrop_path ? '✓ موجود' : '✗ مفقود')
    compareField('التريلر', series.trailer_key ? '✓ موجود' : '✗ مفقود',
                 localSeries?.trailer_key ? '✓ موجود' : '✗ مفقود',
                 tmdbSeries?.videos?.results?.[0]?.key ? '✓ موجود' : '✗ مفقود')
    compareField('الوصف', series.overview_ar ? `${String(series.overview_ar).substring(0, 40)}...` : '✗ مفقود',
                 localSeries?.overview_ar ? `${String(localSeries.overview_ar).substring(0, 40)}...` : '✗ مفقود',
                 tmdbSeries?.overview ? `${tmdbSeries.overview.substring(0, 40)}...` : '✗ مفقود')
    
    console.log('  ─────────────────────────────────────────')
  }
}

// ============================================
// 5. Summary Statistics
// ============================================

async function printSummary() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 ملخص إحصائي')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Turso stats
  const tursoMovieCount = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const tursoSeriesCount = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  
  console.log('📡 Turso (Cloud):')
  console.log(`  • الأفلام: ${tursoMovieCount.rows[0].count.toLocaleString()}`)
  console.log(`  • المسلسلات: ${tursoSeriesCount.rows[0].count.toLocaleString()}`)
  console.log('')

  // Local stats
  if (localDb) {
    try {
      const localMovieCount = localDb.prepare('SELECT COUNT(*) as count FROM movies').get()
      const localSeriesCount = localDb.prepare('SELECT COUNT(*) as count FROM tv_series').get()
      
      console.log('💾 Local SQLite:')
      console.log(`  • الأفلام: ${localMovieCount.count.toLocaleString()}`)
      console.log(`  • المسلسلات: ${localSeriesCount.count.toLocaleString()}`)
      console.log('')
    } catch (e) {
      console.log('💾 Local SQLite: بيانات غير متاحة\n')
    }
  }

  console.log('🌐 TMDB API:')
  console.log('  • المصدر الأساسي لجميع البيانات')
  console.log('  • يتم جلب البيانات حسب الطلب\n')
}

// ============================================
// 6. Main Execution
// ============================================

async function main() {
  try {
    await analyzeMovies()
    await analyzeSeries()
    await printSummary()

    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║                    ✅ اكتمل التحليل                       ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('📝 الملاحظات:')
    console.log('  ✅ = البيانات متطابقة في المصادر الثلاثة')
    console.log('  ⚠️  = البيانات مختلفة أو مفقودة في أحد المصادر')
    console.log('  ❌ NULL = الحقل فارغ أو غير موجود')
    console.log('')

  } catch (error) {
    console.error('\n❌ خطأ:', error.message)
    console.error(error.stack)
  } finally {
    if (localDb) localDb.close()
    process.exit(0)
  }
}

main()
