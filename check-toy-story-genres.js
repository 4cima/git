import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const localDb = new Database(join(__dirname, 'data', '4cima-local.db'))

console.log('\n🔍 فحص حكاية لعبة (Toy Story)...\n')

// البحث عن حكاية لعبة
const toyStory = localDb.prepare(`
  SELECT * FROM movies WHERE title_ar LIKE '%حكاية لعبة%' OR title_en LIKE '%Toy Story%'
`).all()

console.log(`📊 عدد النتائج: ${toyStory.length}\n`)

toyStory.forEach((movie, idx) => {
  console.log(`\n${idx + 1}. 🎬 ${movie.title_ar} (${movie.title_en})`)
  console.log(`   TMDB ID: ${movie.tmdb_id}`)
  console.log(`   ⭐ ${movie.vote_average} | 📈 ${movie.popularity}`)
  console.log(`   📅 ${movie.release_date}`)
  console.log(`   🖼️  Poster: ${movie.poster_path ? '✅' : '❌'}`)
  console.log(`   🎨 Backdrop: ${movie.backdrop_path ? '✅' : '❌'}`)
  
  // فحص التصنيفات من جدول content_genres
  const genres = localDb.prepare(`
    SELECT g.tmdb_id, g.name_en, g.name_ar
    FROM content_genres cg
    JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
    WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
  `).all(movie.tmdb_id)
  
  console.log(`   🎭 التصنيفات من content_genres: ${genres.length > 0 ? genres.map(g => g.name_ar || g.name_en).join(', ') : '❌ لا يوجد'}`)
  
  // فحص genres_json المدمج
  if (movie.genres_json) {
    try {
      const genresJsonParsed = JSON.parse(movie.genres_json)
      console.log(`   📦 genres_json: ${genresJsonParsed.length > 0 ? genresJsonParsed.map(g => g.name_ar || g.name).join(', ') : '❌ فارغ'}`)
    } catch (e) {
      console.log(`   📦 genres_json: ❌ خطأ في التحليل`)
    }
  } else {
    console.log(`   📦 genres_json: ❌ NULL`)
  }
})

localDb.close()
