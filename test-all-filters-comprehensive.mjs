import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('═══════════════════════════════════════════════════════════')
console.log('اختبار شامل لكل الفلاتر - الأفلام والمسلسلات')
console.log('═══════════════════════════════════════════════════════════\n')

// Helper function
async function testFilter(table, filterName, sql, args, limit = 20) {
  const start = Date.now()
  try {
    const result = await turso.execute({
      sql: sql,
      args: args
    })
    const time = Date.now() - start
    const count = result.rows[0]?.count || result.rows.length
    
    const status = time < 500 ? '🟢 سريع' : time < 2000 ? '🟡 متوسط' : time < 5000 ? '🟠 بطيء' : '🔴 بطيء جداً'
    const emoji = count > 0 ? '✅' : '❌'
    
    console.log(`  ${emoji} ${filterName}: ${time}ms ${status} - ${count} نتيجة`)
    return { filterName, time, count, status, working: count > 0 }
  } catch (err) {
    console.log(`  ❌ ${filterName}: فشل - ${err.message}`)
    return { filterName, time: -1, count: 0, status: '❌ خطأ', working: false }
  }
}

// ═══════════════════════════════════════════════════════════
// القسم 1: اختبار فلاتر الأفلام
// ═══════════════════════════════════════════════════════════

console.log('════════════════ اختبار فلاتر الأفلام ════════════════\n')

// 1. فلتر التصنيف (13 تصنيف)
console.log('1️⃣  فلتر التصنيف (Genre):')
console.log('─────────────────────────────────────────────────────────')
const movieGenres = [
  'دراما', 'كوميديا', 'أكشن', 'إثارة', 'رومانسي', 
  'خيال علمي', 'رعب', 'جريمة', 'مغامرة', 
  'رسوم متحركة', 'عائلي', 'فانتازيا', 'حرب'
]

const movieGenreResults = []
for (const genre of movieGenres) {
  const result = await testFilter(
    'movies',
    genre,
    `SELECT COUNT(*) as count FROM movies WHERE genres_json LIKE ? LIMIT 1000`,
    [`%"name_ar":"${genre}"%`]
  )
  movieGenreResults.push(result)
}

// 2. فلتر السنة (20 خيار)
console.log('\n2️⃣  فلتر السنة (Year):')
console.log('─────────────────────────────────────────────────────────')
const movieYears = [
  { label: '2026', sql: 'release_year = 2026' },
  { label: '2025', sql: 'release_year = 2025' },
  { label: '2024', sql: 'release_year = 2024' },
  { label: '2023', sql: 'release_year = 2023' },
  { label: '2020', sql: 'release_year = 2020' },
  { label: '2015', sql: 'release_year = 2015' },
  { label: '2010', sql: 'release_year = 2010' },
  { label: 'الألفينات (2000-2010)', sql: 'release_year BETWEEN 2000 AND 2010' },
  { label: 'التسعينات (1990-1999)', sql: 'release_year BETWEEN 1990 AND 1999' },
  { label: 'كلاسيكي (<1990)', sql: 'release_year < 1990' },
]

const movieYearResults = []
for (const year of movieYears) {
  const result = await testFilter(
    'movies',
    year.label,
    `SELECT COUNT(*) as count FROM movies WHERE ${year.sql}`,
    []
  )
  movieYearResults.push(result)
}

// 3. فلتر التقييم (7 نطاقات)
console.log('\n3️⃣  فلتر التقييم (Rating):')
console.log('─────────────────────────────────────────────────────────')
const movieRatings = [
  { label: '9.1-10 مذهل', min: 9.1, max: 10 },
  { label: '8.1-9 ممتاز', min: 8.1, max: 9.0 },
  { label: '7.1-8 جيد جداً', min: 7.1, max: 8.0 },
  { label: '6.1-7 جيد', min: 6.1, max: 7.0 },
  { label: '5.1-6 مقبول', min: 5.1, max: 6.0 },
  { label: '4.1-5 متوسط', min: 4.1, max: 5.0 },
  { label: '3.1-4 ضعيف', min: 3.1, max: 4.0 },
]

const movieRatingResults = []
for (const rating of movieRatings) {
  const result = await testFilter(
    'movies',
    rating.label,
    `SELECT COUNT(*) as count FROM movies WHERE vote_average BETWEEN ? AND ?`,
    [rating.min, rating.max]
  )
  movieRatingResults.push(result)
}

// 4. فلتر الدولة (16 دولة)
console.log('\n4️⃣  فلتر الدولة (Country):')
console.log('─────────────────────────────────────────────────────────')
const countries = [
  { label: 'أمريكا', code: 'US' },
  { label: 'اليابان', code: 'JP' },
  { label: 'بريطانيا', code: 'GB' },
  { label: 'الصين', code: 'CN' },
  { label: 'كوريا', code: 'KR' },
  { label: 'كندا', code: 'CA' },
  { label: 'فرنسا', code: 'FR' },
  { label: 'ألمانيا', code: 'DE' },
  { label: 'الهند', code: 'IN' },
  { label: 'تايلاند', code: 'TH' },
  { label: 'روسيا', code: 'RU' },
  { label: 'أستراليا', code: 'AU' },
  { label: 'البرازيل', code: 'BR' },
  { label: 'المكسيك', code: 'MX' },
  { label: 'تركيا', code: 'TR' },
]

const movieCountryResults = []
for (const country of countries) {
  const result = await testFilter(
    'movies',
    country.label,
    `SELECT COUNT(*) as count FROM movies WHERE countries_json LIKE ?`,
    [`%${country.code}%`]
  )
  movieCountryResults.push(result)
}

// 5. فلتر الترتيب (8 خيارات)
console.log('\n5️⃣  فلتر الترتيب (Sort):')
console.log('─────────────────────────────────────────────────────────')
const movieSorts = [
  { label: 'الأكثر شهرة', col: 'popularity', order: 'DESC' },
  { label: 'الأعلى تقييماً', col: 'vote_average', order: 'DESC' },
  { label: 'الأكثر تقييماً', col: 'vote_count', order: 'DESC' },
  { label: 'الأحدث', col: 'release_year', order: 'DESC' },
  { label: 'الأقدم', col: 'release_year', order: 'ASC' },
  { label: 'آخر إضافة', col: 'created_at', order: 'DESC' },
  { label: 'الاسم (أ-ي)', col: 'title_ar', order: 'ASC' },
  { label: 'الاسم (ي-أ)', col: 'title_ar', order: 'DESC' },
]

const movieSortResults = []
for (const sort of movieSorts) {
  const result = await testFilter(
    'movies',
    sort.label,
    `SELECT COUNT(*) as count FROM (SELECT id FROM movies ORDER BY ${sort.col} ${sort.order} LIMIT 20)`,
    []
  )
  movieSortResults.push(result)
}

// ═══════════════════════════════════════════════════════════
// القسم 2: اختبار فلاتر المسلسلات
// ═══════════════════════════════════════════════════════════

console.log('\n\n════════════════ اختبار فلاتر المسلسلات ════════════════\n')

// 1. فلتر التصنيف (18 تصنيف)
console.log('1️⃣  فلتر التصنيف (Genre):')
console.log('─────────────────────────────────────────────────────────')
const seriesGenres = [
  'دراما', 'كوميديا', 'رسوم متحركة', 'وثائقي',
  'أكشن ومغامرة', 'خيال علمي وفانتازيا', 'جريمة', 'واقعي',
  'غموض', 'عائلي', 'أطفال', 'دراما اجتماعية',
  'حرب وسياسة', 'برنامج حواري', 'أخبار', 'غربي',
  'رومانسي', 'تاريخي'
]

const seriesGenreResults = []
for (const genre of seriesGenres) {
  const result = await testFilter(
    'tv_series',
    genre,
    `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ? LIMIT 1000`,
    [`%"name_ar":"${genre}"%`]
  )
  seriesGenreResults.push(result)
}

// 2. فلتر السنة (نفس خيارات الأفلام)
console.log('\n2️⃣  فلتر السنة (Year):')
console.log('─────────────────────────────────────────────────────────')

const seriesYearResults = []
for (const year of movieYears) {
  const sql = year.sql.replace('release_year', 'first_air_year')
  const result = await testFilter(
    'tv_series',
    year.label,
    `SELECT COUNT(*) as count FROM tv_series WHERE ${sql}`,
    []
  )
  seriesYearResults.push(result)
}

// 3. فلتر التقييم (نفس نطاقات الأفلام)
console.log('\n3️⃣  فلتر التقييم (Rating):')
console.log('─────────────────────────────────────────────────────────')

const seriesRatingResults = []
for (const rating of movieRatings) {
  const result = await testFilter(
    'tv_series',
    rating.label,
    `SELECT COUNT(*) as count FROM tv_series WHERE vote_average BETWEEN ? AND ?`,
    [rating.min, rating.max]
  )
  seriesRatingResults.push(result)
}

// 4. فلتر الدولة (نفس دول الأفلام)
console.log('\n4️⃣  فلتر الدولة (Country):')
console.log('─────────────────────────────────────────────────────────')

const seriesCountryResults = []
for (const country of countries) {
  const result = await testFilter(
    'tv_series',
    country.label,
    `SELECT COUNT(*) as count FROM tv_series WHERE country_of_origin = ?`,
    [country.code]
  )
  seriesCountryResults.push(result)
}

// 5. فلتر الترتيب (8 خيارات)
console.log('\n5️⃣  فلتر الترتيب (Sort):')
console.log('─────────────────────────────────────────────────────────')
const seriesSorts = [
  { label: 'الأكثر شهرة', col: 'popularity', order: 'DESC' },
  { label: 'الأعلى تقييماً', col: 'vote_average', order: 'DESC' },
  { label: 'الأكثر تقييماً', col: 'vote_count', order: 'DESC' },
  { label: 'الأحدث', col: 'first_air_year', order: 'DESC' },
  { label: 'الأقدم', col: 'first_air_year', order: 'ASC' },
  { label: 'آخر إضافة', col: 'created_at', order: 'DESC' },
  { label: 'الاسم (أ-ي)', col: 'name_ar', order: 'ASC' },
  { label: 'الاسم (ي-أ)', col: 'name_ar', order: 'DESC' },
]

const seriesSortResults = []
for (const sort of seriesSorts) {
  const result = await testFilter(
    'tv_series',
    sort.label,
    `SELECT COUNT(*) as count FROM (SELECT id FROM tv_series ORDER BY ${sort.col} ${sort.order} LIMIT 20)`,
    []
  )
  seriesSortResults.push(result)
}

// ═══════════════════════════════════════════════════════════
// القسم 3: تقرير مفصل
// ═══════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════')
console.log('📊 ملخص النتائج')
console.log('═══════════════════════════════════════════════════════════\n')

function summarize(title, results) {
  const total = results.length
  const working = results.filter(r => r.working).length
  const fast = results.filter(r => r.time < 500).length
  const medium = results.filter(r => r.time >= 500 && r.time < 2000).length
  const slow = results.filter(r => r.time >= 2000 && r.time < 5000).length
  const verySlow = results.filter(r => r.time >= 5000).length
  const broken = results.filter(r => !r.working).length
  
  console.log(`${title}:`)
  console.log(`  الإجمالي: ${total}`)
  console.log(`  ✅ شغال: ${working} (${(working/total*100).toFixed(0)}%)`)
  console.log(`  ❌ مش شغال: ${broken}`)
  console.log(`  🟢 سريع (<500ms): ${fast}`)
  console.log(`  🟡 متوسط (500-2000ms): ${medium}`)
  console.log(`  🟠 بطيء (2-5s): ${slow}`)
  console.log(`  🔴 بطيء جداً (>5s): ${verySlow}`)
  
  // Show slowest items
  const sorted = [...results].sort((a, b) => b.time - a.time)
  const slowest = sorted.slice(0, 3).filter(r => r.time > 1000)
  if (slowest.length > 0) {
    console.log(`  ⚠️  الأبطأ:`)
    slowest.forEach(s => console.log(`     - ${s.filterName}: ${s.time}ms`))
  }
  
  // Show broken items
  if (broken > 0) {
    const brokenItems = results.filter(r => !r.working)
    console.log(`  ❌ المعطلة:`)
    brokenItems.forEach(b => console.log(`     - ${b.filterName}`))
  }
  
  console.log('')
}

console.log('🎬 الأفلام:')
console.log('─────────────────────────────────────────────────────────')
summarize('  فلتر التصنيف', movieGenreResults)
summarize('  فلتر السنة', movieYearResults)
summarize('  فلتر التقييم', movieRatingResults)
summarize('  فلتر الدولة', movieCountryResults)
summarize('  فلتر الترتيب', movieSortResults)

console.log('📺 المسلسلات:')
console.log('─────────────────────────────────────────────────────────')
summarize('  فلتر التصنيف', seriesGenreResults)
summarize('  فلتر السنة', seriesYearResults)
summarize('  فلتر التقييم', seriesRatingResults)
summarize('  فلتر الدولة', seriesCountryResults)
summarize('  فلتر الترتيب', seriesSortResults)

await turso.close()
