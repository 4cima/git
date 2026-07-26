import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const localDb = new Database(join(__dirname, 'data', '4cima-local.db'))

console.log('\n🔍 تحقيق: كيف دخل المحتوى الحساس للقاعدة المحلية؟\n')
console.log('='*80)

// كلمات مفتاحية للمحتوى الممنوع
const BLOCKED_KEYWORDS = [
  'sex', 'جنس', 'الجنس',
  'porn', 'إباحي', 'إباحية',
  'xxx', 'adult only',
  'erotic', 'erotica',
  'nude', 'عاري', 'عارية',
  'hentai', 'هنتاي'
]

function hasBlockedKeyword(text) {
  const textLower = (text || '').toLowerCase()
  for (const keyword of BLOCKED_KEYWORDS) {
    if (textLower.includes(keyword.toLowerCase())) {
      return keyword
    }
  }
  return null
}

// فحص الأفلام
console.log('\n🎬 فحص الأفلام المكتملة بحثاً عن محتوى حساس...\n')

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

console.log(`📊 إجمالي الأفلام المكتملة: ${movies.length}`)

const blockedMovies = []

for (const movie of movies) {
  const titleMatch = hasBlockedKeyword(movie.title_ar + ' ' + movie.title_en)
  const overviewMatch = hasBlockedKeyword(movie.overview_ar)
  
  if (titleMatch || overviewMatch) {
    blockedMovies.push({
      ...movie,
      matched_in: titleMatch ? 'title' : 'overview',
      matched_keyword: titleMatch || overviewMatch
    })
  }
}

console.log(`🚫 أفلام تحتوي على محتوى حساس: ${blockedMovies.length}\n`)

if (blockedMovies.length > 0) {
  console.log('تفاصيل الأفلام المحظورة:\n')
  blockedMovies.forEach((movie, idx) => {
    console.log(`${idx + 1}. 🎬 ${movie.title_ar} (${movie.title_en})`)
    console.log(`   TMDB ID: ${movie.tmdb_id}`)
    console.log(`   كلمة محظورة: "${movie.matched_keyword}" في ${movie.matched_in === 'title' ? 'العنوان' : 'الوصف'}`)
    console.log(`   التقييم: ${movie.vote_average} | الشعبية: ${movie.popularity}`)
    console.log(`   تاريخ الإضافة: ${movie.created_at || 'غير محدد'}`)
    
    // فحص التصنيفات
    const genres = localDb.prepare(`
      SELECT g.name_en, g.name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(movie.tmdb_id)
    
    console.log(`   التصنيفات: ${genres.map(g => g.name_ar || g.name_en).join(', ')}`)
    
    // فحص الـ adult flag
    console.log(`   adult flag: ${movie.adult ? '✅ TRUE (محتوى للكبار)' : '❌ FALSE'}`)
    console.log('')
  })
}

// فحص المسلسلات
console.log('\n📺 فحص المسلسلات المكتملة بحثاً عن محتوى حساس...\n')

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

console.log(`📊 إجمالي المسلسلات المكتملة: ${series.length}`)

const blockedSeries = []

for (const show of series) {
  const titleMatch = hasBlockedKeyword(show.name_ar + ' ' + show.name_en)
  const overviewMatch = hasBlockedKeyword(show.overview_ar)
  
  if (titleMatch || overviewMatch) {
    blockedSeries.push({
      ...show,
      matched_in: titleMatch ? 'title' : 'overview',
      matched_keyword: titleMatch || overviewMatch
    })
  }
}

console.log(`🚫 مسلسلات تحتوي على محتوى حساس: ${blockedSeries.length}\n`)

if (blockedSeries.length > 0) {
  console.log('تفاصيل المسلسلات المحظورة:\n')
  blockedSeries.forEach((show, idx) => {
    console.log(`${idx + 1}. 📺 ${show.name_ar} (${show.name_en})`)
    console.log(`   TMDB ID: ${show.tmdb_id}`)
    console.log(`   كلمة محظورة: "${show.matched_keyword}" في ${show.matched_in === 'title' ? 'العنوان' : 'الوصف'}`)
    console.log(`   التقييم: ${show.vote_average} | الشعبية: ${show.popularity}`)
    console.log(`   تاريخ الإضافة: ${show.created_at || 'غير محدد'}`)
    
    // فحص التصنيفات
    const genres = localDb.prepare(`
      SELECT g.name_en, g.name_ar
      FROM content_genres cg
      JOIN genres g ON cg.genre_tmdb_id = g.tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(show.tmdb_id)
    
    console.log(`   التصنيفات: ${genres.map(g => g.name_ar || g.name_en).join(', ')}`)
    console.log(`   adult flag: ${show.adult ? '✅ TRUE (محتوى للكبار)' : '❌ FALSE'}`)
    console.log('')
  })
}

// الخلاصة
console.log('\n' + '='*80)
console.log('📊 الخلاصة:')
console.log('='*80)
console.log(`✅ محتوى آمن: ${movies.length - blockedMovies.length} فيلم + ${series.length - blockedSeries.length} مسلسل`)
console.log(`🚫 محتوى محظور: ${blockedMovies.length} فيلم + ${blockedSeries.length} مسلسل`)
console.log('')
console.log('⚠️  السبب المحتمل:')
console.log('   1. سكريبتات السحب القديمة لم تكن تفحص الـ adult flag')
console.log('   2. لم يكن هناك فلتر للكلمات المفتاحية')
console.log('   3. TMDB يسمح بهذا المحتوى في API العادي')
console.log('')
console.log('✅ الحل المطبق:')
console.log('   - فلتر فوري بالكلمات المفتاحية')
console.log('   - فحص adult flag في سكريبتات المستقبل')
console.log('   - مزامنة المحتوى الآمن فقط لـ Turso')
console.log('='*80 + '\n')

localDb.close()
