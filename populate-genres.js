// تحديث التصنيفات من TMDB
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// قائمة التصنيفات الشائعة (مسقطة من TMDB API)
const MOVIE_GENRES = {
  28: { id: 28, name: 'Action', name_ar: 'أكشن' },
  12: { id: 12, name: 'Adventure', name_ar: 'مغامرة' },
  16: { id: 16, name: 'Animation', name_ar: 'رسوم متحركة' },
  35: { id: 35, name: 'Comedy', name_ar: 'كوميديا' },
  80: { id: 80, name: 'Crime', name_ar: 'جريمة' },
  99: { id: 99, name: 'Documentary', name_ar: 'وثائقي' },
  18: { id: 18, name: 'Drama', name_ar: 'دراما' },
  10751: { id: 10751, name: 'Family', name_ar: 'عائلي' },
  14: { id: 14, name: 'Fantasy', name_ar: 'فانتازيا' },
  36: { id: 36, name: 'History', name_ar: 'تاريخي' },
  27: { id: 27, name: 'Horror', name_ar: 'رعب' },
  10402: { id: 10402, name: 'Music', name_ar: 'موسيقى' },
  9648: { id: 9648, name: 'Mystery', name_ar: 'غموض' },
  10749: { id: 10749, name: 'Romance', name_ar: 'رومانسي' },
  878: { id: 878, name: 'Science Fiction', name_ar: 'خيال علمي' },
  10770: { id: 10770, name: 'TV Movie', name_ar: 'فيلم تلفزيوني' },
  53: { id: 53, name: 'Thriller', name_ar: 'إثارة' },
  10752: { id: 10752, name: 'War', name_ar: 'حرب' },
  37: { id: 37, name: 'Western', name_ar: 'ويسترن' }
}

const TV_GENRES = {
  10759: { id: 10759, name: 'Action & Adventure', name_ar: 'أكشن ومغامرة' },
  16: { id: 16, name: 'Animation', name_ar: 'رسوم متحركة' },
  35: { id: 35, name: 'Comedy', name_ar: 'كوميديا' },
  80: { id: 80, name: 'Crime', name_ar: 'جريمة' },
  99: { id: 99, name: 'Documentary', name_ar: 'وثائقي' },
  18: { id: 18, name: 'Drama', name_ar: 'دراما' },
  10751: { id: 10751, name: 'Family', name_ar: 'عائلي' },
  14: { id: 14, name: 'Fantasy', name_ar: 'فانتازيا' },
  10762: { id: 10762, name: 'Kids', name_ar: 'أطفال' },
  9648: { id: 9648, name: 'Mystery', name_ar: 'غموض' },
  10763: { id: 10763, name: 'News', name_ar: 'أخبار' },
  10765: { id: 10765, name: 'Sci-Fi & Fantasy', name_ar: 'خيال علمي وفانتازيا' },
  10764: { id: 10764, name: 'Reality', name_ar: 'واقعي' },
  10766: { id: 10766, name: 'Soap', name_ar: 'درامي' },
  10767: { id: 10767, name: 'Talk', name_ar: 'حديث' },
  10768: { id: 10768, name: 'War & Politics', name_ar: 'حرب وسياسة' },
  37: { id: 37, name: 'Western', name_ar: 'ويسترن' }
}

// تصنيفات تجريبية لأفلام معروفة
const SAMPLE_MOVIE_GENRES = {
  'The Predator': [28, 53], // Action, Thriller
  'Super Mario': [16, 10751], // Animation, Family
  'Send Help': [35], // Comedy
  'Your Heart Will Break': [18], // Drama
  'Michael': [18, 80], // Drama, Crime
  'Avatar: Fire and Ash': [12, 14, 878], // Adventure, Fantasy, Sci-Fi
  'They Will Kill You': [27, 53], // Horror, Thriller
  'Hoppers': [35], // Comedy
  'The Avengers': [28, 12, 878], // Action, Adventure, Sci-Fi
  'Project Hell Mary': [878, 12] // Sci-Fi, Adventure
}

const SAMPLE_TV_GENRES = {
  'Law & Order: SVU': [80, 18], // Crime, Drama
  'Supernatural': [27, 14], // Horror, Fantasy
  'Grey\'s Anatomy': [18, 10751], // Drama, Family
  'Bones': [80, 18], // Crime, Drama
  'Family Guy': [16, 35], // Animation, Comedy
  'The Office': [35], // Comedy
  'House': [18], // Drama
  'CSI': [80, 18], // Crime, Drama
  'Daredevil': [10759, 14], // Action & Adventure, Fantasy
  'The Tonight Show': [35, 10767] // Comedy, Talk
}

async function populateGenres() {
  console.log('🎯 بدء تحديث التصنيفات...\n')
  
  // تحديث الأفلام
  console.log('🎬 تحديث تصنيفات الأفلام...')
  const movies = await turso.execute({
    sql: `SELECT id, title_ar, title_en FROM movies LIMIT 50`,
    args: []
  })
  
  let movieCount = 0
  for (const movie of movies.rows) {
    const title = movie.title_ar || movie.title_en || ''
    let genreIds = []
    
    // البحث عن التصنيفات المطابقة
    for (const [key, ids] of Object.entries(SAMPLE_MOVIE_GENRES)) {
      if (title.includes(key) || title.toLowerCase().includes(key.toLowerCase())) {
        genreIds = ids
        break
      }
    }
    
    // إذا لم نجد تصنيفات محددة، نضيف تصنيف عام
    if (genreIds.length === 0) {
      genreIds = [18] // Drama كتصنيف افتراضي
    }
    
    const genreObjects = genreIds.map(id => MOVIE_GENRES[id]).filter(Boolean)
    const genresJson = JSON.stringify(genreObjects)
    
    await turso.execute({
      sql: `UPDATE movies SET genres_json = ? WHERE id = ?`,
      args: [genresJson, movie.id]
    })
    
    console.log(`✅ ${movie.title_ar}: ${genreObjects.map(g => g.name_ar).join(', ')}`)
    movieCount++
  }
  
  // تحديث المسلسلات
  console.log('\n📺 تحديث تصنيفات المسلسلات...')
  const series = await turso.execute({
    sql: `SELECT id, name_ar, name_en FROM tv_series LIMIT 50`,
    args: []
  })
  
  let tvCount = 0
  for (const show of series.rows) {
    const title = show.name_ar || show.name_en || ''
    let genreIds = []
    
    // البحث عن التصنيفات المطابقة
    for (const [key, ids] of Object.entries(SAMPLE_TV_GENRES)) {
      if (title.includes(key) || title.toLowerCase().includes(key.toLowerCase())) {
        genreIds = ids
        break
      }
    }
    
    // إذا لم نجد تصنيفات محددة، نضيف تصنيف عام
    if (genreIds.length === 0) {
      genreIds = [18] // Drama كتصنيف افتراضي
    }
    
    const genreObjects = genreIds.map(id => TV_GENRES[id]).filter(Boolean)
    const genresJson = JSON.stringify(genreObjects)
    
    await turso.execute({
      sql: `UPDATE tv_series SET genres_json = ? WHERE id = ?`,
      args: [genresJson, show.id]
    })
    
    console.log(`✅ ${show.name_ar}: ${genreObjects.map(g => g.name_ar).join(', ')}`)
    tvCount++
  }
  
  console.log(`\n✅ تم تحديث ${movieCount} فيلم و ${tvCount} مسلسل`)
}

populateGenres().catch(console.error)
