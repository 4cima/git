// مزامنة 20 عمل مكتمل من القاعدة المحلية إلى Turso
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

async function sync20Complete() {
  console.log('🔄 مزامنة 20 عمل مكتمل من القاعدة المحلية إلى Turso\n')
  console.log('='*80)
  
  // جلب 10 أفلام مكتملة (مع تصنيفات)
  console.log('\n🎬 جلب 10 أفلام مكتملة (مع تصنيفات)...\n')
  const movies = localDb.prepare(`
    SELECT DISTINCT m.*
    FROM movies m
    INNER JOIN content_genres cg ON m.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'movie'
    WHERE m.title_ar IS NOT NULL AND m.title_ar != ''
      AND m.overview_ar IS NOT NULL AND m.overview_ar != ''
      AND m.poster_path IS NOT NULL AND m.poster_path != ''
      AND m.backdrop_path IS NOT NULL AND m.backdrop_path != ''
      AND m.vote_average > 6
      AND m.popularity > 10
    ORDER BY m.popularity DESC
    LIMIT 10
  `).all()
  
  console.log(`✅ تم جلب ${movies.length} فيلم\n`)
  
  // عرض تفاصيل الأفلام
  movies.forEach((movie, idx) => {
    console.log(`📽️ فيلم #${idx + 1}: ${movie.title_ar}`)
    console.log(`   الإنجليزي: ${movie.title_en}`)
    console.log(`   التقييم: ⭐ ${movie.vote_average} | السنة: ${movie.release_year}`)
    console.log(`   التصنيف: ${movie.primary_genre || 'غير محدد'}`)
    console.log(`   الوصف: ${movie.overview_ar.substring(0, 60)}...`)
    console.log(`   بوستر: ${movie.poster_path}`)
    console.log(`   باكدروب: ${movie.backdrop_path}`)
    console.log(`   الشعبية: ${movie.popularity}`)
    console.log('')
  })
  
  // جلب 10 مسلسلات مكتملة (مع تصنيفات)
  console.log('\n📺 جلب 10 مسلسلات مكتملة (مع تصنيفات)...\n')
  const series = localDb.prepare(`
    SELECT DISTINCT s.*
    FROM tv_series s
    INNER JOIN content_genres cg ON s.tmdb_id = cg.content_tmdb_id AND cg.content_type = 'tv'
    WHERE s.name_ar IS NOT NULL AND s.name_ar != ''
      AND s.overview_ar IS NOT NULL AND s.overview_ar != ''
      AND s.poster_path IS NOT NULL AND s.poster_path != ''
      AND s.backdrop_path IS NOT NULL AND s.backdrop_path != ''
      AND s.vote_average > 6
      AND s.popularity > 10
    ORDER BY s.popularity DESC
    LIMIT 10
  `).all()
  
  console.log(`✅ تم جلب ${series.length} مسلسل\n`)
  
  // عرض تفاصيل المسلسلات
  series.forEach((show, idx) => {
    console.log(`📺 مسلسل #${idx + 1}: ${show.name_ar}`)
    console.log(`   الإنجليزي: ${show.name_en}`)
    console.log(`   التقييم: ⭐ ${show.vote_average} | السنة: ${show.first_air_year}`)
    console.log(`   التصنيف: ${show.primary_genre || 'غير محدد'}`)
    console.log(`   الوصف: ${show.overview_ar.substring(0, 60)}...`)
    console.log(`   بوستر: ${show.poster_path}`)
    console.log(`   باكدروب: ${show.backdrop_path}`)
    console.log(`   الشعبية: ${show.popularity}`)
    console.log('')
  })
  
  // مزامنة الأفلام إلى Turso
  console.log('\n🔄 مزامنة الأفلام إلى Turso...\n')
  for (const movie of movies) {
    // جلب كل التصنيفات للفيلم
    const movieGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(movie.tmdb_id)
    
    const genresJson = JSON.stringify(movieGenres)
    
    await turso.execute({
      sql: `INSERT INTO movies (
        id, tmdb_id, slug, title_en, title_ar, overview_ar,
        poster_path, backdrop_path, release_date, release_year,
        vote_average, trailer_key, genres_json, popularity,
        canonical_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
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
        movie.release_year,
        movie.vote_average,
        movie.trailer_key,
        genresJson,
        movie.popularity,
        movie.canonical_url
      ]
    })
    
    console.log(`✅ ${movie.title_ar}`)
  }
  
  // مزامنة المسلسلات إلى Turso
  console.log('\n🔄 مزامنة المسلسلات إلى Turso...\n')
  for (const show of series) {
    // جلب كل التصنيفات للمسلسل
    const seriesGenres = localDb.prepare(`
      SELECT g.tmdb_id as id, g.name_en as name, g.name_ar as name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(show.tmdb_id)
    
    const genresJson = JSON.stringify(seriesGenres)
    
    await turso.execute({
      sql: `INSERT INTO tv_series (
        id, tmdb_id, slug, name_en, name_ar, overview_ar,
        poster_path, backdrop_path, first_air_date, first_air_year,
        vote_average, trailer_key, genres_json, popularity,
        number_of_seasons, number_of_episodes, status,
        canonical_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
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
        show.first_air_year,
        show.vote_average,
        show.trailer_key,
        genresJson,
        show.popularity,
        show.number_of_seasons,
        show.number_of_episodes,
        show.status,
        show.canonical_url
      ]
    })
    
    console.log(`✅ ${show.name_ar}`)
  }
  
  console.log('\n✅ تمت المزامنة بنجاح!')
  
  localDb.close()
}

sync20Complete().catch(console.error)
