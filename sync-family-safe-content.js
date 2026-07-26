// مزامنة المحتوى العائلي الآمن فقط - بدون محتوى للكبار
import Database from 'better-sqlite3'
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const localDb = new Database(join(__dirname, 'data', '4cima-local.db'))
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

console.log('\n🔒 مزامنة المحتوى العائلي الآمن فقط\n')
console.log('='*80)

// ============================================
// شروط المحتوى العائلي الآمن:
// ============================================
// 1. عنوان عربي
// 2. وصف عربي
// 3. بوستر
// 4. باكدروب
// 5. تقييم > 0
// 6. تصنيفات موجودة
// 7. ⚠️ استبعاد المحتوى الحساس (adult content)
// ============================================

// كلمات مفتاحية للمحتوى الممنوع (بالعربي والإنجليزي)
const BLOCKED_KEYWORDS = [
  'sex', 'جنس', 'الجنس',
  'porn', 'إباحي', 'إباحية',
  'xxx', 'adult only',
  'erotic', 'erotica',
  'nude', 'عاري', 'عارية',
  'hentai', 'هنتاي'
]

// أنواع (genres) ممنوعة
const BLOCKED_GENRE_IDS = [
  // لا يوجد genre ID محدد للمحتوى الحساس في TMDB
  // لكن نفحص بالكلمات المفتاحية
]

function isContentSafe(title, overview, genres) {
  // فحص العنوان
  const titleLower = (title || '').toLowerCase()
  for (const keyword of BLOCKED_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return false
    }
  }
  
  // فحص الوصف
  const overviewLower = (overview || '').toLowerCase()
  for (const keyword of BLOCKED_KEYWORDS) {
    if (overviewLower.includes(keyword.toLowerCase())) {
      return false
    }
  }
  
  return true
}

async function syncFamilySafeContent() {
  // جلب الأفلام المكتملة
  console.log('\n🎬 جلب الأفلام المكتملة...\n')
  
  const movies = localDb.prepare(`
    SELECT DISTINCT m.*
    FROM movies m
    INNER JOIN content_genres cg ON m.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'movie'
    WHERE m.title_ar IS NOT NULL AND m.title_ar != ''
      AND m.overview_ar IS NOT NULL AND m.overview_ar != ''
      AND m.poster_path IS NOT NULL AND m.poster_path != ''
      AND m.backdrop_path IS NOT NULL AND m.backdrop_path != ''
      AND m.vote_average > 0
    ORDER BY m.popularity DESC
  `).all()
  
  console.log(`📊 إجمالي: ${movies.length} فيلم`)
  
  // فلترة المحتوى
  const safeMovies = movies.filter(movie => {
    const genres = localDb.prepare(`
      SELECT g.name_en, g.name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(movie.tmdb_id)
    
    return isContentSafe(movie.title_ar + ' ' + movie.title_en, movie.overview_ar, genres)
  })
  
  console.log(`✅ آمن: ${safeMovies.length} فيلم`)
  console.log(`🚫 محظور: ${movies.length - safeMovies.length} فيلم\n`)
  
  // جلب المسلسلات المكتملة
  console.log('📺 جلب المسلسلات المكتملة...\n')
  
  const series = localDb.prepare(`
    SELECT DISTINCT s.*
    FROM tv_series s
    INNER JOIN content_genres cg ON s.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'tv'
    WHERE s.name_ar IS NOT NULL AND s.name_ar != ''
      AND s.overview_ar IS NOT NULL AND s.overview_ar != ''
      AND s.poster_path IS NOT NULL AND s.poster_path != ''
      AND s.backdrop_path IS NOT NULL AND s.backdrop_path != ''
      AND s.vote_average > 0
    ORDER BY s.popularity DESC
  `).all()
  
  console.log(`📊 إجمالي: ${series.length} مسلسل`)
  
  // فلترة المحتوى
  const safeSeries = series.filter(show => {
    const genres = localDb.prepare(`
      SELECT g.name_en, g.name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(show.tmdb_id)
    
    return isContentSafe(show.name_ar + ' ' + show.name_en, show.overview_ar, genres)
  })
  
  console.log(`✅ آمن: ${safeSeries.length} مسلسل`)
  console.log(`🚫 محظور: ${series.length - safeSeries.length} مسلسل\n`)
  
  console.log('='*80)
  console.log(`📊 إجمالي المحتوى الآمن: ${safeMovies.length + safeSeries.length} عمل`)
  console.log('='*80)
  
  // المزامنة
  console.log('\n\n🔄 بدء المزامنة إلى Turso...')
  console.log('='*80)
  
  // مزامنة الأفلام الآمنة
  console.log('\n🎬 مزامنة الأفلام الآمنة...')
  let moviesSynced = 0
  
  for (const movie of safeMovies) {
    const movieGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(movie.tmdb_id)
    
    const genresJson = JSON.stringify(movieGenres)
    const castJson = movie.cast_json || null
    
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO movies (
          id, tmdb_id, slug, title_en, title_ar, overview_ar,
          poster_path, backdrop_path, release_date, release_year,
          vote_average, vote_count, popularity, runtime,
          trailer_key, genres_json, cast_json,
          canonical_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [
          movie.tmdb_id,
          movie.tmdb_id,
          movie.slug,
          movie.title_en,
          movie.title_ar,
          movie.overview_ar,
          movie.poster_path,
          movie.backdrop_path,
          movie.release_date,
          movie.release_year || new Date(movie.release_date).getFullYear(),
          movie.vote_average,
          movie.vote_count || 0,
          movie.popularity || 0,
          movie.runtime || null,
          movie.trailer_key,
          genresJson,
          castJson,
          movie.canonical_url
        ]
      })
      
      moviesSynced++
      if (moviesSynced % 50 === 0 || moviesSynced <= 5) {
        console.log(`   ✅ ${moviesSynced}/${safeMovies.length} - ${movie.title_ar}`)
      }
    } catch (error) {
      console.error(`   ❌ خطأ في ${movie.title_ar}:`, error.message)
    }
  }
  
  // مزامنة المسلسلات الآمنة
  console.log('\n📺 مزامنة المسلسلات الآمنة...')
  let seriesSynced = 0
  
  for (const show of safeSeries) {
    const seriesGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(show.tmdb_id)
    
    const genresJson = JSON.stringify(seriesGenres)
    const castJson = show.cast_json || null
    
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO tv_series (
          id, tmdb_id, slug, name_en, name_ar, overview_ar,
          poster_path, backdrop_path, first_air_date, first_air_year,
          vote_average, vote_count, popularity,
          trailer_key, genres_json, cast_json,
          number_of_seasons, number_of_episodes, status,
          canonical_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [
          show.tmdb_id,
          show.tmdb_id,
          show.slug,
          show.name_en,
          show.name_ar,
          show.overview_ar,
          show.poster_path,
          show.backdrop_path,
          show.first_air_date,
          show.first_air_year || new Date(show.first_air_date).getFullYear(),
          show.vote_average,
          show.vote_count || 0,
          show.popularity || 0,
          show.trailer_key,
          genresJson,
          castJson,
          show.number_of_seasons,
          show.number_of_episodes,
          show.status,
          show.canonical_url
        ]
      })
      
      seriesSynced++
      console.log(`   ✅ ${seriesSynced}/${safeSeries.length} - ${show.name_ar}`)
    } catch (error) {
      console.error(`   ❌ خطأ في ${show.name_ar}:`, error.message)
    }
  }
  
  console.log('\n' + '='*80)
  console.log('✅ تمت المزامنة بنجاح!')
  console.log(`   🎬 أفلام: ${moviesSynced}/${safeMovies.length}`)
  console.log(`   📺 مسلسلات: ${seriesSynced}/${safeSeries.length}`)
  console.log('='*80)
  
  localDb.close()
}

syncFamilySafeContent().catch(console.error)
