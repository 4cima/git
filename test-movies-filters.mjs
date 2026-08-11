import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('═══════════════════════════════════════════════════════════')
console.log('اختبار فلاتر صفحة الأفلام')
console.log('═══════════════════════════════════════════════════════════\n')

// Test 1: Genre filter (دراما)
console.log('1. اختبار فلتر التصنيف (دراما):')
console.log('─────────────────────────────────────────────────────────')

const genreTest = await turso.execute({
  sql: 'SELECT tmdb_id, slug, name_ar FROM genres WHERE name_ar = ? OR slug = ? LIMIT 1',
  args: ['دراما', 'دراما']
})

if (genreTest.rows.length > 0) {
  const tmdbId = genreTest.rows[0].tmdb_id
  console.log(`  ✅ وجد التصنيف: tmdb_id = ${tmdbId}, slug = ${genreTest.rows[0].slug}`)
  
  const start = Date.now()
  const moviesResult = await turso.execute({
    sql: `
      SELECT COUNT(*) as count
      FROM movies
      WHERE EXISTS (
        SELECT 1 FROM json_each(genres_json)
        WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
      )
    `,
    args: [tmdbId]
  })
  const time = Date.now() - start
  
  console.log(`  📊 عدد الأفلام: ${moviesResult.rows[0].count}`)
  console.log(`  ⏱️  الوقت: ${time}ms`)
} else {
  console.log('  ❌ التصنيف غير موجود في جدول genres')
}

// Test 2: Year filter
console.log('\n2. اختبار فلتر السنة (2024):')
console.log('─────────────────────────────────────────────────────────')

const yearResult = await turso.execute({
  sql: 'SELECT COUNT(*) as count FROM movies WHERE release_year = ?',
  args: [2024]
})
console.log(`  📊 عدد أفلام 2024: ${yearResult.rows[0].count}`)

// Test 3: Rating filter
console.log('\n3. اختبار فلتر التقييم (8.1-9):')
console.log('─────────────────────────────────────────────────────────')

const ratingResult = await turso.execute({
  sql: 'SELECT COUNT(*) as count FROM movies WHERE vote_average BETWEEN ? AND ?',
  args: [8.1, 9.0]
})
console.log(`  📊 عدد الأفلام بتقييم 8.1-9: ${ratingResult.rows[0].count}`)

// Test 4: Country filter
console.log('\n4. اختبار فلتر الدولة (US):')
console.log('─────────────────────────────────────────────────────────')

const countryResult = await turso.execute({
  sql: "SELECT COUNT(*) as count FROM movies WHERE countries_json LIKE ?",
  args: ['%US%']
})
console.log(`  📊 عدد الأفلام الأمريكية: ${countryResult.rows[0].count}`)

// Test 5: Combined filters (Genre + Year)
console.log('\n5. اختبار فلاتر مجمعة (دراما + 2024):')
console.log('─────────────────────────────────────────────────────────')

if (genreTest.rows.length > 0) {
  const tmdbId = genreTest.rows[0].tmdb_id
  const combinedResult = await turso.execute({
    sql: `
      SELECT COUNT(*) as count
      FROM movies
      WHERE release_year = ?
      AND EXISTS (
        SELECT 1 FROM json_each(genres_json)
        WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
      )
    `,
    args: [2024, tmdbId]
  })
  console.log(`  📊 عدد أفلام دراما 2024: ${combinedResult.rows[0].count}`)
}

// Test 6: Check actual API call
console.log('\n6. اختبار API الفعلي (/api/movies?genre=دراما&year=2024):')
console.log('─────────────────────────────────────────────────────────')

try {
  const apiResponse = await fetch('http://localhost:3000/api/movies?genre=دراما&year=2024&limit=5')
  if (apiResponse.ok) {
    const data = await apiResponse.json()
    console.log(`  ✅ API Response: ${data.movies?.length || 0} أفلام`)
    if (data.movies?.length > 0) {
      console.log(`  📝 مثال: ${data.movies[0].title_ar}`)
    }
  } else {
    console.log(`  ❌ API Error: ${apiResponse.status}`)
  }
} catch (err) {
  console.log(`  ⚠️  لا يمكن الوصول للـ API (السيرفر مش شغال؟)`)
}

console.log('\n═══════════════════════════════════════════════════════════')

await turso.close()
