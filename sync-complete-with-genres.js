// مزامنة الأعمال المكتملة فقط (مع شرط التصنيفات)
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

console.log('\n🔄 مزامنة الأعمال المكتملة (مع شرط التصنيفات)\n')
console.log('='*80)

// ============================================
// شروط الاكتمال الجديدة (تشمل التصنيفات):
// ============================================
// 1. عنوان عربي
// 2. وصف عربي
// 3. بوستر
// 4. باكدروب
// 5. تقييم > 0
// 6. تصنيفات (من جدول content_genres)
// ============================================

async function syncCompleteWorks() {
  // جلب الأفلام المكتملة (مع تصنيفات)
  console.log('\n🎬 جلب الأفلام المكتملة (مع تصنيفات)...\n')
  
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
  
  console.log(`✅ تم جلب ${movies.length} فيلم مكتمل\n`)
  
  // جلب المسلسلات المكتملة (مع تصنيفات)
  console.log('📺 جلب المسلسلات المكتملة (مع تصنيفات)...\n')
  
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
  
  console.log(`✅ تم جلب ${series.length} مسلسل مكتمل\n`)
  
  console.log('='*80)
  console.log(`📊 المجموع: ${movies.length + series.length} عمل مكتمل`)
  console.log('='*80)
  
  // عرض عينة من البيانات
  console.log('\n\n📋 عينة من الأفلام (أول 10):')
  console.log('-'*80)
  
  movies.slice(0, 10).forEach((movie, idx) => {
    // جلب التصنيفات
    const movieGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(movie.tmdb_id)
    
    console.log(`\n${idx + 1}. 🎬 ${movie.title_ar}`)
    console.log(`   ⭐ ${movie.vote_average} | 📈 ${movie.popularity}`)
    console.log(`   🎭 ${movieGenres.map(g => g.name_ar || g.name).join(', ')}`)
  })
  
  console.log('\n\n📋 عينة من المسلسلات (جميعها):')
  console.log('-'*80)
  
  series.forEach((show, idx) => {
    // جلب التصنيفات
    const seriesGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(show.tmdb_id)
    
    console.log(`\n${idx + 1}. 📺 ${show.name_ar}`)
    console.log(`   ⭐ ${show.vote_average} | 📈 ${show.popularity}`)
    console.log(`   🎭 ${seriesGenres.map(g => g.name_ar || g.name).join(', ')}`)
  })
  
  // سؤال المستخدم قبل المزامنة
  console.log('\n\n' + '='*80)
  console.log('⚠️  هل تريد مزامنة هذه الأعمال إلى Turso؟')
  console.log(`   - ${movies.length} فيلم`)
  console.log(`   - ${series.length} مسلسل`)
  console.log('='*80)
  console.log('\n🛑 لم يتم تنفيذ المزامنة بعد.')
  console.log('💡 لتنفيذ المزامنة، قم بتعديل السكريبت وإلغاء التعليق عن كود المزامنة.\n')
  
  // ============================================
  // كود المزامنة (مُفَعَّل الآن)
  // ============================================
  
  
  console.log('\n\n🔄 بدء المزامنة إلى Turso...')
  console.log('='*80)
  
  // مزامنة الأفلام
  console.log('\n🎬 مزامنة الأفلام...')
  let moviesSynced = 0
  
  for (const movie of movies) {
    // جلب التصنيفات من content_genres (المصدر الموثوق)
    const movieGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(movie.tmdb_id)
    
    // بناء genres_json من جدول content_genres (مش من العمود القديم)
    const genresJson = JSON.stringify(movieGenres)
    
    // cast_json - نستخدم الموجود في القاعدة المحلية (إذا كان موجود)
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
        console.log(`   ✅ ${moviesSynced}/${movies.length} - ${movie.title_ar}`)
      }
    } catch (error) {
      console.error(`   ❌ خطأ في ${movie.title_ar}:`, error.message)
    }
  }
  
  // مزامنة المسلسلات
  console.log('\n📺 مزامنة المسلسلات...')
  let seriesSynced = 0
  
  for (const show of series) {
    // جلب التصنيفات من content_genres (المصدر الموثوق)
    const seriesGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(show.tmdb_id)
    
    // بناء genres_json من جدول content_genres (مش من العمود القديم)
    const genresJson = JSON.stringify(seriesGenres)
    
    // cast_json - نستخدم الموجود في القاعدة المحلية (إذا كان موجود)
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
      console.log(`   ✅ ${seriesSynced}/${series.length} - ${show.name_ar}`)
    } catch (error) {
      console.error(`   ❌ خطأ في ${show.name_ar}:`, error.message)
    }
  }
  
  console.log('\n' + '='*80)
  console.log('✅ تمت المزامنة بنجاح!')
  console.log(`   🎬 أفلام: ${moviesSynced}/${movies.length}`)
  console.log(`   📺 مسلسلات: ${seriesSynced}/${series.length}`)
  console.log('='*80)
  
  
  localDb.close()
}

syncCompleteWorks().catch(console.error)
