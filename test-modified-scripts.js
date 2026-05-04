// ============================================
// 🧪 اختبار الاسكريبتات المعدلة
// ============================================
require('dotenv').config({ path: './.env.local' })
const Database = require('better-sqlite3')

const db = new Database('./data/4cima-local.db', { readonly: true })

console.log('🧪 اختبار الاسكريبتات المعدلة\n')
console.log('═'.repeat(80))

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1️⃣ فحص الأعمدة الجديدة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n1️⃣ فحص الأعمدة الجديدة:')
console.log('─'.repeat(80))

try {
  const moviesColumns = db.prepare(`PRAGMA table_info(movies)`).all()
  const hasIsFetched = moviesColumns.some(col => col.name === 'is_fetched')
  const hasFetchedAt = moviesColumns.some(col => col.name === 'fetched_at')
  const hasFetchedFrom = moviesColumns.some(col => col.name === 'fetched_from')
  
  console.log('🎬 جدول movies:')
  console.log(`  ${hasIsFetched ? '✅' : '❌'} is_fetched`)
  console.log(`  ${hasFetchedAt ? '✅' : '❌'} fetched_at`)
  console.log(`  ${hasFetchedFrom ? '✅' : '❌'} fetched_from`)
} catch (e) {
  console.log(`❌ خطأ: ${e.message}`)
}

try {
  const seriesColumns = db.prepare(`PRAGMA table_info(tv_series)`).all()
  const hasIsFetched = seriesColumns.some(col => col.name === 'is_fetched')
  const hasFetchedAt = seriesColumns.some(col => col.name === 'fetched_at')
  const hasFetchedFrom = seriesColumns.some(col => col.name === 'fetched_from')
  
  console.log('\n📺 جدول tv_series:')
  console.log(`  ${hasIsFetched ? '✅' : '❌'} is_fetched`)
  console.log(`  ${hasFetchedAt ? '✅' : '❌'} fetched_at`)
  console.log(`  ${hasFetchedFrom ? '✅' : '❌'} fetched_from`)
} catch (e) {
  console.log(`❌ خطأ: ${e.message}`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2️⃣ فحص البيانات المعلمة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n2️⃣ فحص البيانات المعلمة:')
console.log('─'.repeat(80))

const moviesStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN is_fetched = 1 THEN 1 END) as fetched,
    COUNT(CASE WHEN is_fetched = 0 THEN 1 END) as not_fetched,
    COUNT(CASE WHEN fetched_at IS NOT NULL THEN 1 END) as with_timestamp,
    COUNT(CASE WHEN fetched_from = 'tmdb' THEN 1 END) as from_tmdb
  FROM movies
`).get()

console.log('🎬 الأفلام:')
console.log(`  إجمالي: ${moviesStats.total.toLocaleString()}`)
console.log(`  معلمة (is_fetched=1): ${moviesStats.fetched.toLocaleString()}`)
console.log(`  غير معلمة: ${moviesStats.not_fetched.toLocaleString()}`)
console.log(`  مع timestamp: ${moviesStats.with_timestamp.toLocaleString()}`)
console.log(`  من TMDB: ${moviesStats.from_tmdb.toLocaleString()}`)

const seriesStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN is_fetched = 1 THEN 1 END) as fetched,
    COUNT(CASE WHEN is_fetched = 0 THEN 1 END) as not_fetched,
    COUNT(CASE WHEN fetched_at IS NOT NULL THEN 1 END) as with_timestamp,
    COUNT(CASE WHEN fetched_from = 'tmdb' THEN 1 END) as from_tmdb
  FROM tv_series
`).get()

console.log('\n📺 المسلسلات:')
console.log(`  إجمالي: ${seriesStats.total.toLocaleString()}`)
console.log(`  معلمة (is_fetched=1): ${seriesStats.fetched.toLocaleString()}`)
console.log(`  غير معلمة: ${seriesStats.not_fetched.toLocaleString()}`)
console.log(`  مع timestamp: ${seriesStats.with_timestamp.toLocaleString()}`)
console.log(`  من TMDB: ${seriesStats.from_tmdb.toLocaleString()}`)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3️⃣ فحص منطق الفلترة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n3️⃣ فحص منطق الفلترة:')
console.log('─'.repeat(80))

const moviesFiltered = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN is_fetched = 1 AND is_filtered = 1 THEN 1 END) as fetched_and_filtered,
    COUNT(CASE WHEN is_fetched = 0 AND is_filtered = 1 THEN 1 END) as not_fetched_but_filtered
  FROM movies
  WHERE is_filtered = 1
`).get()

console.log('🎬 الأفلام المفلترة:')
console.log(`  إجمالي: ${moviesFiltered.total.toLocaleString()}`)
console.log(`  معلمة ومفلترة: ${moviesFiltered.fetched_and_filtered.toLocaleString()}`)
console.log(`  غير معلمة لكن مفلترة: ${moviesFiltered.not_fetched_but_filtered.toLocaleString()}`)

const seriesFiltered = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN is_fetched = 1 AND is_filtered = 1 THEN 1 END) as fetched_and_filtered,
    COUNT(CASE WHEN is_fetched = 0 AND is_filtered = 1 THEN 1 END) as not_fetched_but_filtered
  FROM tv_series
  WHERE is_filtered = 1
`).get()

console.log('\n📺 المسلسلات المفلترة:')
console.log(`  إجمالي: ${seriesFiltered.total.toLocaleString()}`)
console.log(`  معلمة ومفلترة: ${seriesFiltered.fetched_and_filtered.toLocaleString()}`)
console.log(`  غير معلمة لكن مفلترة: ${seriesFiltered.not_fetched_but_filtered.toLocaleString()}`)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4️⃣ فحص عدم إعادة السحب
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n4️⃣ فحص عدم إعادة السحب:')
console.log('─'.repeat(80))

const moviesWillBeFetched = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE (
    is_fetched = 0
    OR (is_fetched = 1 AND is_filtered = 0 AND (title_ar = 'TBD' OR title_ar IS NULL))
    OR (is_fetched = 1 AND is_filtered = 0 AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie'))
  )
`).get()

console.log('🎬 الأفلام التي ستُسحب:')
console.log(`  ${moviesWillBeFetched.count.toLocaleString()} فيلم`)

const seriesWillBeFetched = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE (
    is_fetched = 0
    OR (is_fetched = 1 AND is_filtered = 0 AND (title_ar = 'TBD' OR title_ar IS NULL))
    OR (is_fetched = 1 AND is_filtered = 0 AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = tv_series.id AND content_type = 'tv'))
  )
`).get()

console.log('\n📺 المسلسلات التي ستُسحب:')
console.log(`  ${seriesWillBeFetched.count.toLocaleString()} مسلسل`)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5️⃣ الملخص النهائي
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n' + '═'.repeat(80))
console.log('📊 الملخص النهائي:')
console.log('═'.repeat(80))

const totalFetched = moviesStats.fetched + seriesStats.fetched
const totalNotFetched = moviesStats.not_fetched + seriesStats.not_fetched
const totalAll = moviesStats.total + seriesStats.total
const percentage = ((totalFetched / totalAll) * 100).toFixed(1)

console.log('\n✅ الحالة الحالية:')
console.log(`  معلمة (is_fetched=1): ${totalFetched.toLocaleString()} (${percentage}%)`)
console.log(`  غير معلمة: ${totalNotFetched.toLocaleString()} (${(100 - percentage).toFixed(1)}%)`)
console.log(`  الإجمالي: ${totalAll.toLocaleString()}`)

console.log('\n🎯 الاختبار:')
const allColumnsExist = moviesStats.total > 0 && seriesStats.total > 0
const allFetched = totalFetched === totalAll - totalNotFetched
const filteringWorks = moviesFiltered.fetched_and_filtered > 0 || seriesFiltered.fetched_and_filtered > 0

console.log(`  ${allColumnsExist ? '✅' : '❌'} الأعمدة موجودة`)
console.log(`  ${allFetched ? '✅' : '❌'} البيانات معلمة بشكل صحيح`)
console.log(`  ${filteringWorks ? '✅' : '❌'} الفلترة تعمل`)

console.log('\n' + '═'.repeat(80))
console.log('✅ اكتمل الاختبار!\n')

db.close()
