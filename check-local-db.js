// فحص القاعدة المحلية SQLite
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const db = new Database(join(__dirname, 'data', '4cima-local.db'))

console.log('🔍 فحص القاعدة المحلية SQLite\n')
console.log('='*80 + '\n')

// فحص الأفلام
const moviesStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN title_ar IS NOT NULL AND title_ar != '' THEN 1 ELSE 0 END) as with_title_ar,
    SUM(CASE WHEN overview_ar IS NOT NULL AND overview_ar != '' THEN 1 ELSE 0 END) as with_overview,
    SUM(CASE WHEN poster_path IS NOT NULL AND poster_path != '' THEN 1 ELSE 0 END) as with_poster,
    SUM(CASE WHEN backdrop_path IS NOT NULL AND backdrop_path != '' THEN 1 ELSE 0 END) as with_backdrop,
    SUM(CASE WHEN genres_json IS NOT NULL AND genres_json != '' AND genres_json != '[]' THEN 1 ELSE 0 END) as with_genres
  FROM movies
`).get()

console.log('🎬 إحصائيات الأفلام:')
console.log(`   إجمالي: ${moviesStats.total}`)
console.log(`   مع عنوان عربي: ${moviesStats.with_title_ar}`)
console.log(`   مع وصف عربي: ${moviesStats.with_overview}`)
console.log(`   مع بوستر: ${moviesStats.with_poster}`)
console.log(`   مع باكدروب: ${moviesStats.with_backdrop}`)
console.log(`   مع تصنيفات: ${moviesStats.with_genres}`)

// أفلام مكتملة (كل الحقول المهمة موجودة)
const completeMovies = db.prepare(`
  SELECT COUNT(*) as count
  FROM movies
  WHERE title_ar IS NOT NULL AND title_ar != ''
    AND overview_ar IS NOT NULL AND overview_ar != ''
    AND poster_path IS NOT NULL AND poster_path != ''
    AND backdrop_path IS NOT NULL AND backdrop_path != ''
    AND genres_json IS NOT NULL AND genres_json != '' AND genres_json != '[]'
    AND vote_average > 0
`).get()

console.log(`   ✅ أفلام مكتملة البيانات: ${completeMovies.count}`)

// فحص المسلسلات
const seriesStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN name_ar IS NOT NULL AND name_ar != '' THEN 1 ELSE 0 END) as with_name_ar,
    SUM(CASE WHEN overview_ar IS NOT NULL AND overview_ar != '' THEN 1 ELSE 0 END) as with_overview,
    SUM(CASE WHEN poster_path IS NOT NULL AND poster_path != '' THEN 1 ELSE 0 END) as with_poster,
    SUM(CASE WHEN backdrop_path IS NOT NULL AND backdrop_path != '' THEN 1 ELSE 0 END) as with_backdrop,
    SUM(CASE WHEN genres_json IS NOT NULL AND genres_json != '' AND genres_json != '[]' THEN 1 ELSE 0 END) as with_genres
  FROM tv_series
`).get()

console.log('\n📺 إحصائيات المسلسلات:')
console.log(`   إجمالي: ${seriesStats.total}`)
console.log(`   مع اسم عربي: ${seriesStats.with_name_ar}`)
console.log(`   مع وصف عربي: ${seriesStats.with_overview}`)
console.log(`   مع بوستر: ${seriesStats.with_poster}`)
console.log(`   مع باكدروب: ${seriesStats.with_backdrop}`)
console.log(`   مع تصنيفات: ${seriesStats.with_genres}`)

const completeSeries = db.prepare(`
  SELECT COUNT(*) as count
  FROM tv_series
  WHERE name_ar IS NOT NULL AND name_ar != ''
    AND overview_ar IS NOT NULL AND overview_ar != ''
    AND poster_path IS NOT NULL AND poster_path != ''
    AND backdrop_path IS NOT NULL AND backdrop_path != ''
    AND genres_json IS NOT NULL AND genres_json != '' AND genres_json != '[]'
    AND vote_average > 0
`).get()

console.log(`   ✅ مسلسلات مكتملة البيانات: ${completeSeries.count}`)

// عرض 20 عمل مكتمل (10 أفلام + 10 مسلسلات)
console.log('\n\n📋 عينة من 20 عمل مكتمل (10 أفلام + 10 مسلسلات):')
console.log('='*80)

const sampleMovies = db.prepare(`
  SELECT *
  FROM movies
  WHERE title_ar IS NOT NULL AND title_ar != ''
    AND overview_ar IS NOT NULL AND overview_ar != ''
    AND poster_path IS NOT NULL AND poster_path != ''
    AND backdrop_path IS NOT NULL AND backdrop_path != ''
    AND genres_json IS NOT NULL AND genres_json != '' AND genres_json != '[]'
    AND vote_average > 0
  ORDER BY popularity DESC
  LIMIT 10
`).all()

console.log('\n🎬 10 أفلام مكتملة:')
sampleMovies.forEach((movie, idx) => {
  console.log(`\n${idx + 1}. ${movie.title_ar} (${movie.title_en})`)
  console.log(`   ID: ${movie.id} | TMDB: ${movie.tmdb_id}`)
  console.log(`   التقييم: ⭐ ${movie.vote_average} | السنة: ${movie.release_year}`)
  console.log(`   التصنيفات: ${movie.genres_json}`)
  console.log(`   الوصف: ${movie.overview_ar?.substring(0, 80)}...`)
  console.log(`   بوستر: ${movie.poster_path}`)
  console.log(`   باكدروب: ${movie.backdrop_path}`)
})

const sampleSeries = db.prepare(`
  SELECT *
  FROM tv_series
  WHERE name_ar IS NOT NULL AND name_ar != ''
    AND overview_ar IS NOT NULL AND overview_ar != ''
    AND poster_path IS NOT NULL AND poster_path != ''
    AND backdrop_path IS NOT NULL AND backdrop_path != ''
    AND genres_json IS NOT NULL AND genres_json != '' AND genres_json != '[]'
    AND vote_average > 0
  ORDER BY popularity DESC
  LIMIT 10
`).all()

console.log('\n\n📺 10 مسلسلات مكتملة:')
sampleSeries.forEach((series, idx) => {
  console.log(`\n${idx + 1}. ${series.name_ar} (${series.name_en})`)
  console.log(`   ID: ${series.id} | TMDB: ${series.tmdb_id}`)
  console.log(`   التقييم: ⭐ ${series.vote_average} | السنة: ${series.first_air_year}`)
  console.log(`   التصنيفات: ${series.genres_json}`)
  console.log(`   الوصف: ${series.overview_ar?.substring(0, 80)}...`)
  console.log(`   بوستر: ${series.poster_path}`)
  console.log(`   باكدروب: ${series.backdrop_path}`)
})

console.log('\n\n✅ انتهى الفحص')

db.close()
