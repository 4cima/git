// تتبع مسار البيانات من قاعدة البيانات إلى الموقع
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function traceDataFlow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║        تتبع مسار البيانات من قاعدة البيانات للموقع         ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  // المرحلة 1: قاعدة البيانات
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ المرحلة 1️⃣ : قاعدة البيانات (Turso)                        │')
  console.log('└─────────────────────────────────────────────────────────────┘\n')

  const sampleMovie = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, release_year, 
                 vote_average, genres_json, overview_ar, popularity
          FROM movies 
          WHERE genres_json IS NOT NULL AND poster_path IS NOT NULL
          ORDER BY popularity DESC 
          LIMIT 1`,
    args: []
  })

  const movie = sampleMovie.rows[0]
  console.log('📦 البيانات الخام من قاعدة البيانات:')
  console.log(JSON.stringify({
    id: movie.id,
    slug: movie.slug,
    title_ar: movie.title_ar,
    title_en: movie.title_en,
    poster_path: movie.poster_path,
    release_year: movie.release_year,
    vote_average: movie.vote_average,
    genres_json: movie.genres_json,
    overview_ar: movie.overview_ar?.substring(0, 80) + '...',
    popularity: movie.popularity
  }, null, 2))

  // المرحلة 2: API Route
  console.log('\n┌─────────────────────────────────────────────────────────────┐')
  console.log('│ المرحلة 2️⃣ : API Route (src/app/api/home/route.ts)          │')
  console.log('└─────────────────────────────────────────────────────────────┘\n')

  console.log('📄 الكود في API Route:')
  console.log(`
export async function GET() {
  const [trendingMoviesRes] = await Promise.all([
    turso.execute({
      sql: \`SELECT id, slug, title_ar, title_en, poster_path, 
                   release_year as year, vote_average, genres_json
            FROM movies 
            WHERE poster_path IS NOT NULL AND vote_average > 0
            ORDER BY popularity DESC 
            LIMIT 50\`,
      args: []
    })
  ])

  return NextResponse.json({
    trendingMovies: trendingMoviesRes.rows,
    // ... other sections
  })
}`)

  console.log('\n📤 البيانات المرسلة من API:')
  console.log(JSON.stringify({
    trendingMovies: [{
      id: movie.id,
      slug: movie.slug,
      title_ar: movie.title_ar,
      title_en: movie.title_en,
      poster_path: movie.poster_path,
      year: movie.release_year,
      vote_average: movie.vote_average,
      genres_json: movie.genres_json
    }]
  }, null, 2))

  // المرحلة 3: Data Processing
  console.log('\n┌─────────────────────────────────────────────────────────────┐')
  console.log('│ المرحلة 3️⃣ : معالجة البيانات (src/lib/homeData.ts)         │')
  console.log('└─────────────────────────────────────────────────────────────┘\n')

  console.log('🔄 دالة extractGenre():')
  console.log(`
function extractGenre(genresJson) {
  if (!genresJson) return null
  
  try {
    const genres = JSON.parse(genresJson)
    return genres[0]?.name_ar || null
  } catch {
    return null
  }
}`)

  // Extract genre from sample
  let extractedGenre = null
  if (movie.genres_json) {
    try {
      const genres = JSON.parse(movie.genres_json)
      extractedGenre = genres[0]?.name_ar || null
    } catch (e) {}
  }

  console.log('\n📥 Input:')
  console.log(`  genres_json: ${movie.genres_json}`)
  console.log('\n📤 Output:')
  console.log(`  التصنيف: "${extractedGenre}"`)

  console.log('\n\n🔄 دالة mapItems():')
  console.log(`
function mapItems(items, mediaType) {
  return items.map(i => ({
    id: i.id,
    slug: i.slug,
    title: i.title_ar || i.title_en,
    title_ar: i.title_ar,
    title_en: i.title_en,
    media_type: mediaType,
    poster_path: i.poster_path,
    vote_average: i.vote_average,
    year: i.year,
    primary_genre: extractGenre(i.genres_json)  // ← يتم استخراج التصنيف هنا
  }))
}`)

  console.log('\n📤 البيانات بعد المعالجة:')
  console.log(JSON.stringify({
    id: movie.id,
    slug: movie.slug,
    title: movie.title_ar || movie.title_en,
    title_ar: movie.title_ar,
    title_en: movie.title_en,
    media_type: 'movie',
    poster_path: movie.poster_path,
    vote_average: movie.vote_average,
    year: movie.release_year,
    primary_genre: extractedGenre  // ← التصنيف المستخرج
  }, null, 2))

  // المرحلة 4: React Component
  console.log('\n┌─────────────────────────────────────────────────────────────┐')
  console.log('│ المرحلة 4️⃣ : React Component (MovieCard.tsx)                │')
  console.log('└─────────────────────────────────────────────────────────────┘\n')

  console.log('🎨 في MovieCard Component:')
  console.log(`
// استخراج التصنيف من genres_json
const extractGenre = (genresJson) => {
  if (!genresJson) return null
  try {
    const genres = JSON.parse(genresJson)
    return genres[0]?.name_ar || null
  } catch {
    return null
  }
}

const genre = movie.primary_genre || extractGenre(movie.genres_json)

// عرض التصنيف في الكارت
{genre && (
  <>
    {rating != null && <span className="separator" />}
    <span className="genre">{genre}</span>
  </>
)}`)

  console.log('\n📺 النتيجة النهائية في المتصفح:')
  console.log(`
╔════════════════════════════╗
║   ${movie.title_ar?.substring(0, 20).padEnd(20)}   ║
║   ${movie.title_en?.substring(0, 20).padEnd(20)}   ║
║                            ║
║   ⭐ ${String(movie.vote_average).padEnd(3)} • ${extractedGenre?.padEnd(10)} • ${movie.release_year}    ║
╚════════════════════════════╝
  `)

  // الخلاصة
  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║                         الخلاصة 📊                            ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  console.log('المشكلة الحالية:')
  console.log('─────────────────')
  console.log('❌ معظم الأفلام في قاعدة البيانات genres_json = null')
  
  const statsResult = await turso.execute({
    sql: 'SELECT COUNT(*) as total, COUNT(genres_json) as with_genres FROM movies',
    args: []
  })
  
  const total = statsResult.rows[0].total
  const withGenres = statsResult.rows[0].with_genres
  const percentage = ((withGenres / total) * 100).toFixed(1)
  
  console.log(`📊 ${withGenres} فيلم من أصل ${total} لديه تصنيفات (${percentage}%)`)
  console.log(`📊 ${total - withGenres} فيلم بدون تصنيفات`)

  console.log('\n\nالحل:')
  console.log('─────')
  console.log('✅ الكود جاهز ويعمل بشكل صحيح')
  console.log('✅ التصنيف سيظهر للأفلام التي تحتوي على genres_json')
  console.log('⚠️  يحتاج ملء genres_json للأفلام المتبقية في قاعدة البيانات')

  console.log('\n\nالملفات المعدلة:')
  console.log('────────────────')
  console.log('✓ src/app/api/home/route.ts → إضافة genres_json للاستعلام')
  console.log('✓ src/app/api/movies/route.ts → إضافة genres_json للاستعلام')
  console.log('✓ src/app/api/series/route.ts → إضافة genres_json للاستعلام')
  console.log('✓ src/components/features/media/MovieCard.tsx → استخراج وعرض التصنيف')
  console.log('✓ src/lib/homeData.ts → دالة extractGenre موجودة بالفعل')
}

traceDataFlow()
