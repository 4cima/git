// تقرير تفصيلي ممل جداً عن قواعد البيانات
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

console.log('='*100)
console.log('📊 تقرير تفصيلي شامل عن قواعد البيانات')
console.log('='*100)

// ============================================
// 1. قاعدة TURSO (السحابية)
// ============================================
console.log('\n\n🌐 قاعدة بيانات TURSO (السحابية)')
console.log('='*100)

async function analyzeTurso() {
  // إحصائيات الأفلام
  const tursoMovies = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM movies`,
    args: []
  })
  
  const tursoMoviesWithGenres = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM movies WHERE genres_json IS NOT NULL AND genres_json != ''`,
    args: []
  })
  
  const tursoMoviesWithBackdrop = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`,
    args: []
  })
  
  const tursoMoviesAvgRating = await turso.execute({
    sql: `SELECT AVG(vote_average) as avg FROM movies WHERE vote_average > 0`,
    args: []
  })
  
  console.log('\n🎬 الأفلام في TURSO:')
  console.log(`   إجمالي الأفلام: ${tursoMovies.rows[0].count}`)
  console.log(`   أفلام مع تصنيفات: ${tursoMoviesWithGenres.rows[0].count}`)
  console.log(`   أفلام مع باكدروب: ${tursoMoviesWithBackdrop.rows[0].count}`)
  console.log(`   متوسط التقييم: ${tursoMoviesAvgRating.rows[0].avg?.toFixed(2) || 'N/A'}`)
  
  // إحصائيات المسلسلات
  const tursoSeries = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM tv_series`,
    args: []
  })
  
  const tursoSeriesWithGenres = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json IS NOT NULL AND genres_json != ''`,
    args: []
  })
  
  const tursoSeriesWithBackdrop = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`,
    args: []
  })
  
  const tursoSeriesAvgRating = await turso.execute({
    sql: `SELECT AVG(vote_average) as avg FROM tv_series WHERE vote_average > 0`,
    args: []
  })
  
  console.log('\n📺 المسلسلات في TURSO:')
  console.log(`   إجمالي المسلسلات: ${tursoSeries.rows[0].count}`)
  console.log(`   مسلسلات مع تصنيفات: ${tursoSeriesWithGenres.rows[0].count}`)
  console.log(`   مسلسلات مع باكدروب: ${tursoSeriesWithBackdrop.rows[0].count}`)
  console.log(`   متوسط التقييم: ${tursoSeriesAvgRating.rows[0].avg?.toFixed(2) || 'N/A'}`)
  
  // عينة من 5 أفلام في Turso
  console.log('\n\n📋 عينة من الأفلام في TURSO (أول 5):')
  console.log('-'*100)
  const tursoMoviesSample = await turso.execute({
    sql: `SELECT * FROM movies ORDER BY popularity DESC LIMIT 5`,
    args: []
  })
  
  tursoMoviesSample.rows.forEach((movie, idx) => {
    console.log(`\n🎬 فيلم #${idx + 1}:`)
    console.log(`   ID: ${movie.id}`)
    console.log(`   TMDB ID: ${movie.tmdb_id}`)
    console.log(`   Slug: ${movie.slug}`)
    console.log(`   العنوان العربي: ${movie.title_ar}`)
    console.log(`   العنوان الإنجليزي: ${movie.title_en}`)
    console.log(`   الوصف العربي: ${movie.overview_ar ? movie.overview_ar.substring(0, 80) + '...' : 'مفقود'}`)
    console.log(`   البوستر: ${movie.poster_path || 'مفقود'}`)
    console.log(`   الباكدروب: ${movie.backdrop_path || 'مفقود'}`)
    console.log(`   سنة الإصدار: ${movie.release_year || 'غير محدد'}`)
    console.log(`   التقييم: ${movie.vote_average || 'N/A'}`)
    console.log(`   الشعبية: ${movie.popularity || 'N/A'}`)
    console.log(`   التصنيفات JSON: ${movie.genres_json || 'مفقود'}`)
    console.log(`   التريلر: ${movie.trailer_key || 'مفقود'}`)
    console.log(`   تاريخ الإنشاء: ${movie.created_at}`)
    console.log(`   تاريخ التحديث: ${movie.updated_at}`)
  })
  
  // عينة من المسلسلات في Turso
  console.log('\n\n📋 عينة من المسلسلات في TURSO (أول 5):')
  console.log('-'*100)
  const tursoSeriesSample = await turso.execute({
    sql: `SELECT * FROM tv_series ORDER BY popularity DESC LIMIT 5`,
    args: []
  })
  
  tursoSeriesSample.rows.forEach((series, idx) => {
    console.log(`\n📺 مسلسل #${idx + 1}:`)
    console.log(`   ID: ${series.id}`)
    console.log(`   TMDB ID: ${series.tmdb_id}`)
    console.log(`   Slug: ${series.slug}`)
    console.log(`   الاسم العربي: ${series.name_ar}`)
    console.log(`   الاسم الإنجليزي: ${series.name_en}`)
    console.log(`   الوصف العربي: ${series.overview_ar ? series.overview_ar.substring(0, 80) + '...' : 'مفقود'}`)
    console.log(`   البوستر: ${series.poster_path || 'مفقود'}`)
    console.log(`   الباكدروب: ${series.backdrop_path || 'مفقود'}`)
    console.log(`   سنة البدء: ${series.first_air_year || 'غير محدد'}`)
    console.log(`   عدد المواسم: ${series.number_of_seasons || 'N/A'}`)
    console.log(`   عدد الحلقات: ${series.number_of_episodes || 'N/A'}`)
    console.log(`   الحالة: ${series.status || 'N/A'}`)
    console.log(`   التقييم: ${series.vote_average || 'N/A'}`)
    console.log(`   الشعبية: ${series.popularity || 'N/A'}`)
    console.log(`   التصنيفات JSON: ${series.genres_json || 'مفقود'}`)
    console.log(`   التريلر: ${series.trailer_key || 'مفقود'}`)
    console.log(`   تاريخ الإنشاء: ${series.created_at}`)
    console.log(`   تاريخ التحديث: ${series.updated_at}`)
  })
}

// ============================================
// 2. القاعدة المحلية (SQLite)
// ============================================
console.log('\n\n💾 قاعدة البيانات المحلية (SQLite)')
console.log('='*100)

// إحصائيات الأفلام المحلية
const localMoviesCount = localDb.prepare(`SELECT COUNT(*) as count FROM movies`).get()
const localMoviesWithTitle = localDb.prepare(`SELECT COUNT(*) as count FROM movies WHERE title_ar IS NOT NULL AND title_ar != ''`).get()
const localMoviesWithOverview = localDb.prepare(`SELECT COUNT(*) as count FROM movies WHERE overview_ar IS NOT NULL AND overview_ar != ''`).get()
const localMoviesWithBackdrop = localDb.prepare(`SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`).get()
const localMoviesAvgRating = localDb.prepare(`SELECT AVG(vote_average) as avg FROM movies WHERE vote_average > 0`).get()
const localMoviesComplete = localDb.prepare(`
  SELECT COUNT(*) as count FROM movies 
  WHERE title_ar IS NOT NULL AND title_ar != ''
    AND overview_ar IS NOT NULL AND overview_ar != ''
    AND poster_path IS NOT NULL AND poster_path != ''
    AND backdrop_path IS NOT NULL AND backdrop_path != ''
    AND vote_average > 0
`).get()

console.log('\n🎬 الأفلام في القاعدة المحلية:')
console.log(`   إجمالي الأفلام: ${localMoviesCount.count}`)
console.log(`   أفلام مع عنوان عربي: ${localMoviesWithTitle.count}`)
console.log(`   أفلام مع وصف عربي: ${localMoviesWithOverview.count}`)
console.log(`   أفلام مع باكدروب: ${localMoviesWithBackdrop.count}`)
console.log(`   أفلام مكتملة البيانات: ${localMoviesComplete.count}`)
console.log(`   متوسط التقييم: ${localMoviesAvgRating.avg?.toFixed(2) || 'N/A'}`)

// إحصائيات المسلسلات المحلية
const localSeriesCount = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series`).get()
const localSeriesWithName = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series WHERE name_ar IS NOT NULL AND name_ar != ''`).get()
const localSeriesWithOverview = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series WHERE overview_ar IS NOT NULL AND overview_ar != ''`).get()
const localSeriesWithBackdrop = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`).get()
const localSeriesAvgRating = localDb.prepare(`SELECT AVG(vote_average) as avg FROM tv_series WHERE vote_average > 0`).get()
const localSeriesComplete = localDb.prepare(`
  SELECT COUNT(*) as count FROM tv_series 
  WHERE name_ar IS NOT NULL AND name_ar != ''
    AND overview_ar IS NOT NULL AND overview_ar != ''
    AND poster_path IS NOT NULL AND poster_path != ''
    AND backdrop_path IS NOT NULL AND backdrop_path != ''
    AND vote_average > 0
`).get()

console.log('\n📺 المسلسلات في القاعدة المحلية:')
console.log(`   إجمالي المسلسلات: ${localSeriesCount.count}`)
console.log(`   مسلسلات مع اسم عربي: ${localSeriesWithName.count}`)
console.log(`   مسلسلات مع وصف عربي: ${localSeriesWithOverview.count}`)
console.log(`   مسلسلات مع باكدروب: ${localSeriesWithBackdrop.count}`)
console.log(`   مسلسلات مكتملة البيانات: ${localSeriesComplete.count}`)
console.log(`   متوسط التقييم: ${localSeriesAvgRating.avg?.toFixed(2) || 'N/A'}`)

// التصنيفات في القاعدة المحلية
const localGenresCount = localDb.prepare(`SELECT COUNT(*) as count FROM genres`).get()
console.log(`\n🎭 التصنيفات في القاعدة المحلية: ${localGenresCount.count}`)

// عينة من الأفلام المحلية
console.log('\n\n📋 عينة من الأفلام في القاعدة المحلية (أكثر 5 شعبية):')
console.log('-'*100)
const localMoviesSample = localDb.prepare(`
  SELECT * FROM movies 
  WHERE title_ar IS NOT NULL 
  ORDER BY popularity DESC 
  LIMIT 5
`).all()

localMoviesSample.forEach((movie, idx) => {
  console.log(`\n🎬 فيلم #${idx + 1}:`)
  console.log(`   TMDB ID: ${movie.tmdb_id}`)
  console.log(`   Slug: ${movie.slug}`)
  console.log(`   العنوان العربي: ${movie.title_ar}`)
  console.log(`   العنوان الإنجليزي: ${movie.title_en}`)
  console.log(`   العنوان الأصلي: ${movie.title_original || 'غير محدد'}`)
  console.log(`   الوصف العربي: ${movie.overview_ar ? movie.overview_ar.substring(0, 80) + '...' : 'مفقود'}`)
  console.log(`   الوصف الإنجليزي: ${movie.overview_en ? 'موجود' : 'مفقود'}`)
  console.log(`   البوستر: ${movie.poster_path || 'مفقود'}`)
  console.log(`   الباكدروب: ${movie.backdrop_path || 'مفقود'}`)
  console.log(`   سنة الإصدار: ${movie.release_year || 'غير محدد'}`)
  console.log(`   المدة: ${movie.runtime || 'N/A'} دقيقة`)
  console.log(`   التقييم: ${movie.vote_average || 'N/A'}`)
  console.log(`   عدد الأصوات: ${movie.vote_count || 'N/A'}`)
  console.log(`   الشعبية: ${movie.popularity || 'N/A'}`)
  console.log(`   التصنيف الأساسي: ${movie.primary_genre || 'غير محدد'}`)
  console.log(`   التريلر: ${movie.trailer_key || 'مفقود'}`)
  console.log(`   IMDB ID: ${movie.imdb_id || 'مفقود'}`)
  console.log(`   اللغة الأصلية: ${movie.original_language || 'غير محدد'}`)
  console.log(`   بلد الإنتاج: ${movie.country_of_origin || 'غير محدد'}`)
  console.log(`   التصنيف العمري: ${movie.age_rating || 'غير محدد'}`)
  console.log(`   مكتمل: ${movie.is_complete ? 'نعم' : 'لا'}`)
  console.log(`   مزامن إلى Turso: ${movie.synced_to_turso ? 'نعم' : 'لا'}`)
  console.log(`   تاريخ الإنشاء: ${movie.created_at}`)
  console.log(`   تاريخ التحديث: ${movie.updated_at}`)
  
  // جلب تصنيفات الفيلم
  const movieGenres = localDb.prepare(`
    SELECT g.name_ar, g.name_en
    FROM content_genres cg
    JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
    WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
  `).all(movie.tmdb_id)
  
  if (movieGenres.length > 0) {
    console.log(`   التصنيفات: ${movieGenres.map(g => g.name_ar || g.name_en).join(', ')}`)
  } else {
    console.log(`   التصنيفات: لا توجد`)
  }
})

// عينة من المسلسلات المحلية
console.log('\n\n📋 عينة من المسلسلات في القاعدة المحلية (أكثر 5 شعبية):')
console.log('-'*100)
const localSeriesSample = localDb.prepare(`
  SELECT * FROM tv_series 
  WHERE name_ar IS NOT NULL 
  ORDER BY popularity DESC 
  LIMIT 5
`).all()

localSeriesSample.forEach((series, idx) => {
  console.log(`\n📺 مسلسل #${idx + 1}:`)
  console.log(`   TMDB ID: ${series.tmdb_id}`)
  console.log(`   Slug: ${series.slug}`)
  console.log(`   الاسم العربي: ${series.name_ar}`)
  console.log(`   الاسم الإنجليزي: ${series.name_en}`)
  console.log(`   الاسم الأصلي: ${series.name_original || 'غير محدد'}`)
  console.log(`   الوصف العربي: ${series.overview_ar ? series.overview_ar.substring(0, 80) + '...' : 'مفقود'}`)
  console.log(`   الوصف الإنجليزي: ${series.overview_en ? 'موجود' : 'مفقود'}`)
  console.log(`   البوستر: ${series.poster_path || 'مفقود'}`)
  console.log(`   الباكدروب: ${series.backdrop_path || 'مفقود'}`)
  console.log(`   سنة البدء: ${series.first_air_year || 'غير محدد'}`)
  console.log(`   تاريخ البدء: ${series.first_air_date || 'غير محدد'}`)
  console.log(`   تاريخ الانتهاء: ${series.last_air_date || 'مستمر'}`)
  console.log(`   عدد المواسم: ${series.number_of_seasons || 'N/A'}`)
  console.log(`   عدد الحلقات: ${series.number_of_episodes || 'N/A'}`)
  console.log(`   الحالة: ${series.status || 'N/A'}`)
  console.log(`   التقييم: ${series.vote_average || 'N/A'}`)
  console.log(`   عدد الأصوات: ${series.vote_count || 'N/A'}`)
  console.log(`   الشعبية: ${series.popularity || 'N/A'}`)
  console.log(`   التصنيف الأساسي: ${series.primary_genre || 'غير محدد'}`)
  console.log(`   التريلر: ${series.trailer_key || 'مفقود'}`)
  console.log(`   IMDB ID: ${series.imdb_id || 'مفقود'}`)
  console.log(`   اللغة الأصلية: ${series.original_language || 'غير محدد'}`)
  console.log(`   بلد الإنتاج: ${series.country_of_origin || 'غير محدد'}`)
  console.log(`   التصنيف العمري: ${series.age_rating || 'غير محدد'}`)
  console.log(`   مكتمل: ${series.is_complete ? 'نعم' : 'لا'}`)
  console.log(`   مزامن إلى Turso: ${series.synced_to_turso ? 'نعم' : 'لا'}`)
  console.log(`   تاريخ الإنشاء: ${series.created_at}`)
  console.log(`   تاريخ التحديث: ${series.updated_at}`)
  
  // جلب تصنيفات المسلسل
  const seriesGenres = localDb.prepare(`
    SELECT g.name_ar, g.name_en
    FROM content_genres cg
    JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
    WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
  `).all(series.tmdb_id)
  
  if (seriesGenres.length > 0) {
    console.log(`   التصنيفات: ${seriesGenres.map(g => g.name_ar || g.name_en).join(', ')}`)
  } else {
    console.log(`   التصنيفات: لا توجد`)
  }
})

// ملخص المقارنة
console.log('\n\n📊 ملخص المقارنة')
console.log('='*100)
console.log('\n🎬 الأفلام:')
console.log(`   القاعدة المحلية: ${localMoviesCount.count} فيلم`)
console.log(`   TURSO: ${await turso.execute('SELECT COUNT(*) as count FROM movies').then(r => r.rows[0].count)} فيلم`)
console.log(`   الفرق: ${localMoviesCount.count - await turso.execute('SELECT COUNT(*) as count FROM movies').then(r => r.rows[0].count)} فيلم غير مزامن`)

console.log('\n📺 المسلسلات:')
console.log(`   القاعدة المحلية: ${localSeriesCount.count} مسلسل`)
console.log(`   TURSO: ${await turso.execute('SELECT COUNT(*) as count FROM tv_series').then(r => r.rows[0].count)} مسلسل`)
console.log(`   الفرق: ${localSeriesCount.count - await turso.execute('SELECT COUNT(*) as count FROM tv_series').then(r => r.rows[0].count)} مسلسل غير مزامن`)

console.log('\n✅ انتهى التقرير التفصيلي')
console.log('='*100)

await analyzeTurso()
localDb.close()
