// التقرير الشامل الحالي للبيانات في كلا القاعدتين
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

console.log('\n')
console.log('='.repeat(120))
console.log('📊 التقرير الشامل التفصيلي الممل لحالة قواعد البيانات'.padStart(80))
console.log('='.repeat(120))

async function generateReport() {
  // ============================================
  // 1. قاعدة TURSO (السحابية)
  // ============================================
  console.log('\n\n🌐 قاعدة بيانات TURSO (السحابية - الإنتاج)')
  console.log('='.repeat(120))
  
  // الأفلام في Turso
  const tursoMoviesCount = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const tursoMoviesWithGenres = await turso.execute(`SELECT COUNT(*) as count FROM movies WHERE genres_json IS NOT NULL AND genres_json != '[]' AND genres_json != ''`)
  const tursoMoviesWithBackdrop = await turso.execute(`SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`)
  const tursoMoviesWithPoster = await turso.execute(`SELECT COUNT(*) as count FROM movies WHERE poster_path IS NOT NULL AND poster_path != ''`)
  const tursoMoviesWithOverview = await turso.execute(`SELECT COUNT(*) as count FROM movies WHERE overview_ar IS NOT NULL AND overview_ar != ''`)
  const tursoMoviesWithTitle = await turso.execute(`SELECT COUNT(*) as count FROM movies WHERE title_ar IS NOT NULL AND title_ar != ''`)
  
  console.log('\n🎬 الأفلام في TURSO:')
  console.log('   ├─ إجمالي الأفلام:', tursoMoviesCount.rows[0].count)
  console.log('   ├─ أفلام مع عنوان عربي:', tursoMoviesWithTitle.rows[0].count)
  console.log('   ├─ أفلام مع وصف عربي:', tursoMoviesWithOverview.rows[0].count)
  console.log('   ├─ أفلام مع بوستر:', tursoMoviesWithPoster.rows[0].count)
  console.log('   ├─ أفلام مع باكدروب:', tursoMoviesWithBackdrop.rows[0].count)
  console.log('   └─ أفلام مع تصنيفات:', tursoMoviesWithGenres.rows[0].count)
  
  // المسلسلات في Turso
  const tursoSeriesCount = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  const tursoSeriesWithGenres = await turso.execute(`SELECT COUNT(*) as count FROM tv_series WHERE genres_json IS NOT NULL AND genres_json != '[]' AND genres_json != ''`)
  const tursoSeriesWithBackdrop = await turso.execute(`SELECT COUNT(*) as count FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`)
  const tursoSeriesWithPoster = await turso.execute(`SELECT COUNT(*) as count FROM tv_series WHERE poster_path IS NOT NULL AND poster_path != ''`)
  const tursoSeriesWithOverview = await turso.execute(`SELECT COUNT(*) as count FROM tv_series WHERE overview_ar IS NOT NULL AND overview_ar != ''`)
  const tursoSeriesWithName = await turso.execute(`SELECT COUNT(*) as count FROM tv_series WHERE name_ar IS NOT NULL AND name_ar != ''`)
  
  console.log('\n📺 المسلسلات في TURSO:')
  console.log('   ├─ إجمالي المسلسلات:', tursoSeriesCount.rows[0].count)
  console.log('   ├─ مسلسلات مع اسم عربي:', tursoSeriesWithName.rows[0].count)
  console.log('   ├─ مسلسلات مع وصف عربي:', tursoSeriesWithOverview.rows[0].count)
  console.log('   ├─ مسلسلات مع بوستر:', tursoSeriesWithPoster.rows[0].count)
  console.log('   ├─ مسلسلات مع باكدروب:', tursoSeriesWithBackdrop.rows[0].count)
  console.log('   └─ مسلسلات مع تصنيفات:', tursoSeriesWithGenres.rows[0].count)
  
  // عينة من البيانات في Turso
  if (tursoMoviesCount.rows[0].count > 0) {
    console.log('\n\n📋 عينة من الأفلام في TURSO (جميع الأفلام):')
    console.log('-'.repeat(120))
    
    const tursoMovies = await turso.execute('SELECT * FROM movies ORDER BY popularity DESC')
    
    tursoMovies.rows.forEach((movie, idx) => {
      console.log(`\n🎬 فيلم #${idx + 1}:`)
      console.log('   ├─ ID:', movie.id)
      console.log('   ├─ TMDB ID:', movie.tmdb_id)
      console.log('   ├─ Slug:', movie.slug)
      console.log('   ├─ العنوان العربي:', movie.title_ar || '❌ مفقود')
      console.log('   ├─ العنوان الإنجليزي:', movie.title_en || '❌ مفقود')
      console.log('   ├─ الوصف العربي:', movie.overview_ar ? `✅ ${movie.overview_ar.substring(0, 60)}...` : '❌ مفقود')
      console.log('   ├─ البوستر:', movie.poster_path || '❌ مفقود')
      console.log('   ├─ الباكدروب:', movie.backdrop_path || '❌ مفقود')
      console.log('   ├─ سنة الإصدار:', movie.release_year || 'غير محدد')
      console.log('   ├─ التقييم:', movie.vote_average || 'N/A')
      console.log('   ├─ الشعبية:', movie.popularity || 'N/A')
      console.log('   ├─ التصنيفات (genres_json):', movie.genres_json || '❌ مفقود')
      
      // تحليل التصنيفات
      if (movie.genres_json) {
        try {
          const genres = JSON.parse(movie.genres_json)
          console.log('   ├─ عدد التصنيفات:', genres.length)
          if (genres.length > 0) {
            console.log('   ├─ التصنيف الأول:', genres[0].name_ar || genres[0].name, `(ID: ${genres[0].id})`)
            console.log('   ├─ جميع التصنيفات:', genres.map(g => g.name_ar || g.name).join(', '))
          }
        } catch (e) {
          console.log('   ├─ ❌ خطأ في تحليل التصنيفات:', e.message)
        }
      }
      
      console.log('   ├─ التريلر:', movie.trailer_key || 'مفقود')
      console.log('   ├─ تاريخ الإنشاء:', movie.created_at)
      console.log('   └─ تاريخ التحديث:', movie.updated_at)
    })
  }
  
  if (tursoSeriesCount.rows[0].count > 0) {
    console.log('\n\n📋 عينة من المسلسلات في TURSO (جميع المسلسلات):')
    console.log('-'.repeat(120))
    
    const tursoSeries = await turso.execute('SELECT * FROM tv_series ORDER BY popularity DESC')
    
    tursoSeries.rows.forEach((series, idx) => {
      console.log(`\n📺 مسلسل #${idx + 1}:`)
      console.log('   ├─ ID:', series.id)
      console.log('   ├─ TMDB ID:', series.tmdb_id)
      console.log('   ├─ Slug:', series.slug)
      console.log('   ├─ الاسم العربي:', series.name_ar || '❌ مفقود')
      console.log('   ├─ الاسم الإنجليزي:', series.name_en || '❌ مفقود')
      console.log('   ├─ الوصف العربي:', series.overview_ar ? `✅ ${series.overview_ar.substring(0, 60)}...` : '❌ مفقود')
      console.log('   ├─ البوستر:', series.poster_path || '❌ مفقود')
      console.log('   ├─ الباكدروب:', series.backdrop_path || '❌ مفقود')
      console.log('   ├─ سنة البدء:', series.first_air_year || 'غير محدد')
      console.log('   ├─ عدد المواسم:', series.number_of_seasons || 'N/A')
      console.log('   ├─ عدد الحلقات:', series.number_of_episodes || 'N/A')
      console.log('   ├─ الحالة:', series.status || 'N/A')
      console.log('   ├─ التقييم:', series.vote_average || 'N/A')
      console.log('   ├─ الشعبية:', series.popularity || 'N/A')
      console.log('   ├─ التصنيفات (genres_json):', series.genres_json || '❌ مفقود')
      
      // تحليل التصنيفات
      if (series.genres_json) {
        try {
          const genres = JSON.parse(series.genres_json)
          console.log('   ├─ عدد التصنيفات:', genres.length)
          if (genres.length > 0) {
            console.log('   ├─ التصنيف الأول:', genres[0].name_ar || genres[0].name, `(ID: ${genres[0].id})`)
            console.log('   ├─ جميع التصنيفات:', genres.map(g => g.name_ar || g.name).join(', '))
          }
        } catch (e) {
          console.log('   ├─ ❌ خطأ في تحليل التصنيفات:', e.message)
        }
      }
      
      console.log('   ├─ التريلر:', series.trailer_key || 'مفقود')
      console.log('   ├─ تاريخ الإنشاء:', series.created_at)
      console.log('   └─ تاريخ التحديث:', series.updated_at)
    })
  }
  
  if (tursoMoviesCount.rows[0].count === 0 && tursoSeriesCount.rows[0].count === 0) {
    console.log('\n⚠️  قاعدة TURSO فارغة تماماً - لا توجد أي بيانات!')
  }
  
  // ============================================
  // 2. القاعدة المحلية (SQLite)
  // ============================================
  console.log('\n\n💾 قاعدة البيانات المحلية (SQLite - data/4cima-local.db)')
  console.log('='.repeat(120))
  
  // الأفلام في القاعدة المحلية
  const localMoviesCount = localDb.prepare('SELECT COUNT(*) as count FROM movies').get()
  const localMoviesWithTitle = localDb.prepare(`SELECT COUNT(*) as count FROM movies WHERE title_ar IS NOT NULL AND title_ar != ''`).get()
  const localMoviesWithOverview = localDb.prepare(`SELECT COUNT(*) as count FROM movies WHERE overview_ar IS NOT NULL AND overview_ar != ''`).get()
  const localMoviesWithPoster = localDb.prepare(`SELECT COUNT(*) as count FROM movies WHERE poster_path IS NOT NULL AND poster_path != ''`).get()
  const localMoviesWithBackdrop = localDb.prepare(`SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`).get()
  
  // الأفلام مع تصنيفات من جدول content_genres
  const localMoviesWithGenres = localDb.prepare(`
    SELECT COUNT(DISTINCT cg.content_tmdb_id) as count 
    FROM content_genres cg 
    WHERE cg.content_type = 'movie'
  `).get()
  
  // الأفلام المكتملة (مع شرط التصنيفات)
  const localMoviesComplete = localDb.prepare(`
    SELECT COUNT(DISTINCT m.tmdb_id) as count FROM movies m
    INNER JOIN content_genres cg ON m.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'movie'
    WHERE m.title_ar IS NOT NULL AND m.title_ar != ''
      AND m.overview_ar IS NOT NULL AND m.overview_ar != ''
      AND m.poster_path IS NOT NULL AND m.poster_path != ''
      AND m.backdrop_path IS NOT NULL AND m.backdrop_path != ''
      AND m.vote_average > 0
  `).get()
  
  console.log('\n🎬 الأفلام في القاعدة المحلية:')
  console.log('   ├─ إجمالي الأفلام:', localMoviesCount.count)
  console.log('   ├─ أفلام مع عنوان عربي:', localMoviesWithTitle.count)
  console.log('   ├─ أفلام مع وصف عربي:', localMoviesWithOverview.count)
  console.log('   ├─ أفلام مع بوستر:', localMoviesWithPoster.count)
  console.log('   ├─ أفلام مع باكدروب:', localMoviesWithBackdrop.count)
  console.log('   ├─ أفلام مع تصنيفات (من جدول content_genres):', localMoviesWithGenres.count)
  console.log('   └─ أفلام مكتملة البيانات:', localMoviesComplete.count)
  
  // المسلسلات في القاعدة المحلية
  const localSeriesCount = localDb.prepare('SELECT COUNT(*) as count FROM tv_series').get()
  const localSeriesWithName = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series WHERE name_ar IS NOT NULL AND name_ar != ''`).get()
  const localSeriesWithOverview = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series WHERE overview_ar IS NOT NULL AND overview_ar != ''`).get()
  const localSeriesWithPoster = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series WHERE poster_path IS NOT NULL AND poster_path != ''`).get()
  const localSeriesWithBackdrop = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`).get()
  
  const localSeriesWithGenres = localDb.prepare(`
    SELECT COUNT(DISTINCT cg.content_tmdb_id) as count 
    FROM content_genres cg 
    WHERE cg.content_type = 'tv'
  `).get()
  
  const localSeriesComplete = localDb.prepare(`
    SELECT COUNT(DISTINCT s.tmdb_id) as count FROM tv_series s
    INNER JOIN content_genres cg ON s.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'tv'
    WHERE s.name_ar IS NOT NULL AND s.name_ar != ''
      AND s.overview_ar IS NOT NULL AND s.overview_ar != ''
      AND s.poster_path IS NOT NULL AND s.poster_path != ''
      AND s.backdrop_path IS NOT NULL AND s.backdrop_path != ''
      AND s.vote_average > 0
  `).get()
  
  console.log('\n📺 المسلسلات في القاعدة المحلية:')
  console.log('   ├─ إجمالي المسلسلات:', localSeriesCount.count)
  console.log('   ├─ مسلسلات مع اسم عربي:', localSeriesWithName.count)
  console.log('   ├─ مسلسلات مع وصف عربي:', localSeriesWithOverview.count)
  console.log('   ├─ مسلسلات مع بوستر:', localSeriesWithPoster.count)
  console.log('   ├─ مسلسلات مع باكدروب:', localSeriesWithBackdrop.count)
  console.log('   ├─ مسلسلات مع تصنيفات (من جدول content_genres):', localSeriesWithGenres.count)
  console.log('   └─ مسلسلات مكتملة البيانات:', localSeriesComplete.count)
  
  // التصنيفات
  const localGenresCount = localDb.prepare('SELECT COUNT(*) as count FROM genres').get()
  console.log('\n🎭 التصنيفات في القاعدة المحلية:')
  console.log('   └─ إجمالي التصنيفات:', localGenresCount.count)
  
  // عرض جميع التصنيفات المتاحة
  const allGenres = localDb.prepare('SELECT * FROM genres ORDER BY name_en').all()
  console.log('\n📋 قائمة التصنيفات المتاحة:')
  allGenres.forEach((genre, idx) => {
    console.log(`   ${idx + 1}. ${genre.name_ar || genre.name_en} (${genre.name_en}) - TMDB ID: ${genre.tmdb_id}`)
  })
  
  // عينة من الأفلام المكتملة
  console.log('\n\n📋 عينة من الأفلام المكتملة في القاعدة المحلية (أول 10):')
  console.log('-'.repeat(120))
  
  const localMoviesSample = localDb.prepare(`
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
  
  localMoviesSample.forEach((movie, idx) => {
    console.log(`\n🎬 فيلم #${idx + 1}:`)
    console.log('   ├─ TMDB ID:', movie.tmdb_id)
    console.log('   ├─ Slug:', movie.slug)
    console.log('   ├─ العنوان العربي:', movie.title_ar)
    console.log('   ├─ العنوان الإنجليزي:', movie.title_en)
    console.log('   ├─ الوصف العربي:', movie.overview_ar ? `${movie.overview_ar.substring(0, 60)}...` : '❌ مفقود')
    console.log('   ├─ البوستر:', movie.poster_path)
    console.log('   ├─ الباكدروب:', movie.backdrop_path)
    console.log('   ├─ سنة الإصدار:', movie.release_year)
    console.log('   ├─ التقييم:', movie.vote_average)
    console.log('   ├─ الشعبية:', movie.popularity)
    console.log('   ├─ التصنيف الأساسي:', movie.primary_genre || 'غير محدد')
    
    // جلب التصنيفات من جدول content_genres
    const movieGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(movie.tmdb_id)
    
    console.log('   ├─ عدد التصنيفات:', movieGenres.length)
    if (movieGenres.length > 0) {
      console.log('   ├─ التصنيفات:', movieGenres.map(g => `${g.name_ar || g.name} (ID: ${g.id})`).join(', '))
      console.log('   ├─ genres_json format:', JSON.stringify(movieGenres))
    }
    
    console.log('   ├─ مزامن إلى Turso:', movie.synced_to_turso ? '✅ نعم' : '❌ لا')
    console.log('   └─ مكتمل:', movie.is_complete ? '✅ نعم' : '❌ لا')
  })
  
  // عينة من المسلسلات المكتملة
  console.log('\n\n📋 عينة من المسلسلات المكتملة في القاعدة المحلية (أول 10):')
  console.log('-'.repeat(120))
  
  const localSeriesSample = localDb.prepare(`
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
  
  localSeriesSample.forEach((series, idx) => {
    console.log(`\n📺 مسلسل #${idx + 1}:`)
    console.log('   ├─ TMDB ID:', series.tmdb_id)
    console.log('   ├─ Slug:', series.slug)
    console.log('   ├─ الاسم العربي:', series.name_ar)
    console.log('   ├─ الاسم الإنجليزي:', series.name_en)
    console.log('   ├─ الوصف العربي:', series.overview_ar ? `${series.overview_ar.substring(0, 60)}...` : '❌ مفقود')
    console.log('   ├─ البوستر:', series.poster_path)
    console.log('   ├─ الباكدروب:', series.backdrop_path)
    console.log('   ├─ سنة البدء:', series.first_air_year)
    console.log('   ├─ عدد المواسم:', series.number_of_seasons)
    console.log('   ├─ عدد الحلقات:', series.number_of_episodes)
    console.log('   ├─ التقييم:', series.vote_average)
    console.log('   ├─ الشعبية:', series.popularity)
    console.log('   ├─ التصنيف الأساسي:', series.primary_genre || 'غير محدد')
    
    // جلب التصنيفات من جدول content_genres
    const seriesGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(series.tmdb_id)
    
    console.log('   ├─ عدد التصنيفات:', seriesGenres.length)
    if (seriesGenres.length > 0) {
      console.log('   ├─ التصنيفات:', seriesGenres.map(g => `${g.name_ar || g.name} (ID: ${g.id})`).join(', '))
      console.log('   ├─ genres_json format:', JSON.stringify(seriesGenres))
    }
    
    console.log('   ├─ مزامن إلى Turso:', series.synced_to_turso ? '✅ نعم' : '❌ لا')
    console.log('   └─ مكتمل:', series.is_complete ? '✅ نعم' : '❌ لا')
  })
  
  // ============================================
  // 3. المقارنة والملخص
  // ============================================
  console.log('\n\n📊 ملخص المقارنة بين القاعدتين')
  console.log('='.repeat(120))
  
  console.log('\n🎬 الأفلام:')
  console.log('   ├─ القاعدة المحلية: ' + localMoviesCount.count.toLocaleString() + ' فيلم')
  console.log('   ├─ TURSO: ' + tursoMoviesCount.rows[0].count.toLocaleString() + ' فيلم')
  console.log('   └─ الفرق (غير مزامن): ' + (localMoviesCount.count - tursoMoviesCount.rows[0].count).toLocaleString() + ' فيلم')
  
  console.log('\n📺 المسلسلات:')
  console.log('   ├─ القاعدة المحلية: ' + localSeriesCount.count.toLocaleString() + ' مسلسل')
  console.log('   ├─ TURSO: ' + tursoSeriesCount.rows[0].count.toLocaleString() + ' مسلسل')
  console.log('   └─ الفرق (غير مزامن): ' + (localSeriesCount.count - tursoSeriesCount.rows[0].count).toLocaleString() + ' مسلسل')
  
  console.log('\n🎭 التصنيفات:')
  console.log('   ├─ القاعدة المحلية: ' + localGenresCount.count + ' تصنيف')
  console.log('   └─ TURSO: تستخدم genres_json (مضمنة في كل عمل)')
  
  console.log('\n📈 جودة البيانات:')
  console.log('   ├─ أفلام مكتملة في القاعدة المحلية: ' + localMoviesComplete.count + ' / ' + localMoviesCount.count + 
    ` (${((localMoviesComplete.count / localMoviesCount.count) * 100).toFixed(2)}%)`)
  console.log('   ├─ مسلسلات مكتملة في القاعدة المحلية: ' + localSeriesComplete.count + ' / ' + localSeriesCount.count + 
    ` (${((localSeriesComplete.count / localSeriesCount.count) * 100).toFixed(2)}%)`)
  console.log('   └─ أعمال مكتملة إجمالاً: ' + (localMoviesComplete.count + localSeriesComplete.count))
  
  console.log('\n')
  console.log('='.repeat(120))
  console.log('✅ انتهى التقرير التفصيلي الممل'.padStart(70))
  console.log('='.repeat(120))
  console.log('\n')
}

await generateReport()
localDb.close()
