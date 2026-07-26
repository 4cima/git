// فحص الأعمال المكتملة الحقيقية (مع تصنيفات)
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const localDb = new Database(join(__dirname, 'data', '4cima-local.db'))

console.log('🔍 فحص الأعمال المكتملة الحقيقية (مع شرط التصنيفات)\n')
console.log('='.repeat(80))

// فحص الأفلام المكتملة مع تصنيفات
const moviesWithGenres = localDb.prepare(`
  SELECT COUNT(DISTINCT m.tmdb_id) as count 
  FROM movies m
  INNER JOIN content_genres cg ON m.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'movie'
  WHERE m.title_ar IS NOT NULL AND m.title_ar != ''
    AND m.overview_ar IS NOT NULL AND m.overview_ar != ''
    AND m.poster_path IS NOT NULL AND m.poster_path != ''
    AND m.backdrop_path IS NOT NULL AND m.backdrop_path != ''
    AND m.vote_average > 0
`).get()

console.log('🎬 الأفلام المكتملة الحقيقية (مع تصنيفات):', moviesWithGenres.count)

// فحص المسلسلات المكتملة مع تصنيفات
const seriesWithGenres = localDb.prepare(`
  SELECT COUNT(DISTINCT s.tmdb_id) as count 
  FROM tv_series s
  INNER JOIN content_genres cg ON s.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'tv'
  WHERE s.name_ar IS NOT NULL AND s.name_ar != ''
    AND s.overview_ar IS NOT NULL AND s.overview_ar != ''
    AND s.poster_path IS NOT NULL AND s.poster_path != ''
    AND s.backdrop_path IS NOT NULL AND s.backdrop_path != ''
    AND s.vote_average > 0
`).get()

console.log('📺 المسلسلات المكتملة الحقيقية (مع تصنيفات):', seriesWithGenres.count)

console.log('\n' + '='.repeat(80))
console.log('📊 المقارنة:')
console.log('='.repeat(80))

// الأفلام بدون شرط التصنيفات
const moviesWithoutGenreCheck = localDb.prepare(`
  SELECT COUNT(*) as count FROM movies 
  WHERE title_ar IS NOT NULL AND title_ar != ''
    AND overview_ar IS NOT NULL AND overview_ar != ''
    AND poster_path IS NOT NULL AND poster_path != ''
    AND backdrop_path IS NOT NULL AND backdrop_path != ''
    AND vote_average > 0
`).get()

console.log('\n🎬 الأفلام:')
console.log('   بدون شرط التصنيفات:', moviesWithoutGenreCheck.count)
console.log('   مع شرط التصنيفات:', moviesWithGenres.count)
console.log('   الفرق (بدون تصنيفات):', moviesWithoutGenreCheck.count - moviesWithGenres.count)

// المسلسلات بدون شرط التصنيفات
const seriesWithoutGenreCheck = localDb.prepare(`
  SELECT COUNT(*) as count FROM tv_series 
  WHERE name_ar IS NOT NULL AND name_ar != ''
    AND overview_ar IS NOT NULL AND overview_ar != ''
    AND poster_path IS NOT NULL AND poster_path != ''
    AND backdrop_path IS NOT NULL AND backdrop_path != ''
    AND vote_average > 0
`).get()

console.log('\n📺 المسلسلات:')
console.log('   بدون شرط التصنيفات:', seriesWithoutGenreCheck.count)
console.log('   مع شرط التصنيفات:', seriesWithGenres.count)
console.log('   الفرق (بدون تصنيفات):', seriesWithoutGenreCheck.count - seriesWithGenres.count)

// عينة من الأفلام المكتملة مع تصنيفات
console.log('\n\n📋 عينة من الأفلام المكتملة الحقيقية (أول 10):')
console.log('='.repeat(80))

const completeMovies = localDb.prepare(`
  SELECT DISTINCT m.*
  FROM movies m
  INNER JOIN content_genres cg ON m.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'movie'
  WHERE m.title_ar IS NOT NULL AND m.title_ar != ''
    AND m.overview_ar IS NOT NULL AND m.overview_ar != ''
    AND m.poster_path IS NOT NULL AND m.poster_path != ''
    AND m.backdrop_path IS NOT NULL AND m.backdrop_path != ''
    AND m.vote_average > 0
  ORDER BY m.popularity DESC
  LIMIT 10
`).all()

completeMovies.forEach((movie, idx) => {
  console.log(`\n🎬 فيلم #${idx + 1}: ${movie.title_ar}`)
  console.log(`   التقييم: ${movie.vote_average} | الشعبية: ${movie.popularity}`)
  
  // جلب التصنيفات
  const genres = localDb.prepare(`
    SELECT g.name_ar, g.name_en
    FROM content_genres cg
    JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
    WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
  `).all(movie.tmdb_id)
  
  console.log(`   التصنيفات (${genres.length}): ${genres.map(g => g.name_ar || g.name_en).join(', ')}`)
})

// عينة من المسلسلات المكتملة مع تصنيفات
console.log('\n\n📋 عينة من المسلسلات المكتملة الحقيقية (أول 10):')
console.log('='.repeat(80))

const completeSeries = localDb.prepare(`
  SELECT DISTINCT s.*
  FROM tv_series s
  INNER JOIN content_genres cg ON s.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'tv'
  WHERE s.name_ar IS NOT NULL AND s.name_ar != ''
    AND s.overview_ar IS NOT NULL AND s.overview_ar != ''
    AND s.poster_path IS NOT NULL AND s.poster_path != ''
    AND s.backdrop_path IS NOT NULL AND s.backdrop_path != ''
    AND s.vote_average > 0
  ORDER BY s.popularity DESC
  LIMIT 10
`).all()

if (completeSeries.length > 0) {
  completeSeries.forEach((series, idx) => {
    console.log(`\n📺 مسلسل #${idx + 1}: ${series.name_ar}`)
    console.log(`   التقييم: ${series.vote_average} | الشعبية: ${series.popularity}`)
    
    // جلب التصنيفات
    const genres = localDb.prepare(`
      SELECT g.name_ar, g.name_en
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(series.tmdb_id)
    
    console.log(`   التصنيفات (${genres.length}): ${genres.map(g => g.name_ar || g.name_en).join(', ')}`)
  })
} else {
  console.log('\n❌ لا توجد مسلسلات مكتملة مع تصنيفات!')
}

console.log('\n\n✅ انتهى الفحص')

localDb.close()
