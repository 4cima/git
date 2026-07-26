/**
 * اختبار queries الـ3 endpoints للتأكد من استبعاد الأفلام المفلترة
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const knownFilteredMovies = [
  { id: 33, title: 'Unforgiven', slug: 'unforgiven', status: 'needs_review' },
  { id: 103, title: 'Taxi Driver', slug: 'taxi-driver', status: 'blocked' },
  { id: 115, title: 'The Big Lebowski', slug: 'the-big-lebowski', status: 'blocked' },
  { id: 128, title: 'Princess Mononoke', slug: 'princess-mononoke', status: 'needs_review' },
  { id: 142, title: 'Brokeback Mountain', slug: 'brokeback-mountain', status: 'needs_review' },
  { id: 145, title: 'Breaking the Waves', slug: 'breaking-the-waves', status: 'needs_review' }
]

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('🧪 اختبار filter_status على الـ3 endpoints')
  console.log('═══════════════════════════════════════════════════\n')

  // ═══════════════════════════════════════════════════════════
  // 1) /api/home - trending movies
  // ═══════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────')
  console.log('1️⃣  /api/home - Trending Movies')
  console.log('─────────────────────────────────────────────────\n')

  const trendingQuery = `
    SELECT id, slug, title_ar, title_en, tmdb_id, filter_status
    FROM movies 
    WHERE poster_path IS NOT NULL 
      AND backdrop_path IS NOT NULL 
      AND vote_average > 0
      AND (filter_status = 'clean' OR filter_status IS NULL)
    ORDER BY popularity DESC 
    LIMIT 50
  `

  const trendingResult = await turso.execute(trendingQuery)
  console.log(`📊 إجمالي النتائج: ${trendingResult.rows.length}\n`)

  console.log('🔍 هل الـ6 أفلام المفلترة موجودة؟')
  for (const movie of knownFilteredMovies) {
    const found = trendingResult.rows.some(row => row.tmdb_id === movie.id)
    const icon = found ? '❌' : '✅'
    console.log(`   ${icon} [${movie.id}] ${movie.title} (${movie.status}) — ${found ? 'موجود (خطأ!)' : 'مستبعد (صح)'}`)
  }

  // ═══════════════════════════════════════════════════════════
  // 2) /api/movies/[slug] - movie detail
  // ═══════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────')
  console.log('2️⃣  /api/movies/[slug] - Movie Detail')
  console.log('─────────────────────────────────────────────────\n')

  console.log('🔍 محاولة الوصول للـ6 أفلام بالـ slug:\n')
  for (const movie of knownFilteredMovies) {
    const detailQuery = `
      SELECT tmdb_id, title_ar, slug, filter_status
      FROM movies 
      WHERE slug = ? 
        AND (filter_status = 'clean' OR filter_status IS NULL)
      LIMIT 1
    `
    const detailResult = await turso.execute({
      sql: detailQuery,
      args: [movie.slug]
    })

    const found = detailResult.rows.length > 0
    const icon = found ? '❌' : '✅'
    console.log(`   ${icon} [${movie.id}] ${movie.title} (${movie.status})`)
    console.log(`       slug: ${movie.slug} — ${found ? 'موجود (خطأ!)' : '404 Not Found (صح)'}`)
  }

  // ═══════════════════════════════════════════════════════════
  // 3) /api/search - search results
  // ═══════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────')
  console.log('3️⃣  /api/search - Search Results')
  console.log('─────────────────────────────────────────────────\n')

  const searchTerms = [
    { term: 'taxi', expectedMovie: 103 },      // Taxi Driver
    { term: 'lebowski', expectedMovie: 115 },  // The Big Lebowski
    { term: 'unforgiven', expectedMovie: 33 }, // Unforgiven
  ]

  for (const searchTest of searchTerms) {
    const searchTerm = `%${searchTest.term}%`
    const searchQuery = `
      SELECT tmdb_id, title_ar, title_en, filter_status
      FROM movies 
      WHERE (
        title_ar LIKE ? OR 
        title_en LIKE ? OR 
        overview_ar LIKE ?
      )
      AND (filter_status = 'clean' OR filter_status IS NULL)
      ORDER BY popularity DESC
      LIMIT 20
    `

    const searchResult = await turso.execute({
      sql: searchQuery,
      args: [searchTerm, searchTerm, searchTerm]
    })

    const found = searchResult.rows.some(row => row.tmdb_id === searchTest.expectedMovie)
    const icon = found ? '❌' : '✅'
    const movie = knownFilteredMovies.find(m => m.id === searchTest.expectedMovie)

    console.log(`   ${icon} بحث: "${searchTest.term}"`)
    console.log(`       [${movie.id}] ${movie.title} (${movie.status}) — ${found ? 'موجود (خطأ!)' : 'مستبعد (صح)'}`)
    console.log(`       إجمالي النتائج: ${searchResult.rows.length}\n`)
  }

  // ═══════════════════════════════════════════════════════════
  // 4) التحقق النهائي - عدد clean vs filtered
  // ═══════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────')
  console.log('4️⃣  التحقق النهائي')
  console.log('─────────────────────────────────────────────────\n')

  const statusCount = await turso.execute(`
    SELECT filter_status, COUNT(*) as count 
    FROM movies 
    GROUP BY filter_status
  `)

  console.log('📊 توزيع filter_status في Turso:')
  statusCount.rows.forEach(row => {
    console.log(`   ${row.filter_status || 'NULL'}: ${row.count}`)
  })

  const cleanCount = statusCount.rows.find(r => r.filter_status === 'clean')?.count || 0
  const blockedCount = statusCount.rows.find(r => r.filter_status === 'blocked')?.count || 0
  const reviewCount = statusCount.rows.find(r => r.filter_status === 'needs_review')?.count || 0

  console.log('\n✅ الملخص:')
  console.log(`   - يُعرض للمستخدمين: ${cleanCount} فيلم`)
  console.log(`   - محجوب (blocked): ${blockedCount} فيلم`)
  console.log(`   - يحتاج مراجعة (needs_review): ${reviewCount} فيلم`)
  console.log(`   - الإجمالي: ${cleanCount + blockedCount + reviewCount}`)

  console.log('\n═══════════════════════════════════════════════════')
  console.log('✅ الاختبار اكتمل')
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
