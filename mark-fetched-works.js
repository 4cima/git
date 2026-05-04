// ============================================
// 🏷️ تعليم جميع الأعمال المسحوبة بـ is_fetched = 1
// ============================================
require('dotenv').config({ path: './.env.local' })
const Database = require('better-sqlite3')

const db = new Database('./data/4cima-local.db')

console.log('🏷️ بدء تعليم الأعمال المسحوبة\n')
console.log('═'.repeat(80))

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1️⃣ الأفلام
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎬 الأفلام:')
console.log('─'.repeat(80))

// الأفلام المسحوبة (لديها overview_en أو مفلترة)
const moviesCount = db.prepare(`
  SELECT COUNT(*) as c FROM movies
  WHERE (overview_en IS NOT NULL OR is_filtered = 1)
  AND is_fetched = 0
`).get().c

console.log(`📦 عدد الأفلام المحتاجة تعليم: ${moviesCount.toLocaleString()}`)

if (moviesCount > 0) {
  const result = db.prepare(`
    UPDATE movies
    SET is_fetched = 1, fetched_at = datetime('now'), fetched_from = 'tmdb'
    WHERE (overview_en IS NOT NULL OR is_filtered = 1)
    AND is_fetched = 0
  `).run()
  
  console.log(`✅ تم تعليم: ${result.changes.toLocaleString()} فيلم`)
} else {
  console.log(`✅ جميع الأفلام معلمة بالفعل`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2️⃣ المسلسلات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📺 المسلسلات:')
console.log('─'.repeat(80))

// المسلسلات المسحوبة (لديها overview_en أو مفلترة)
const seriesCount = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series
  WHERE (overview_en IS NOT NULL OR is_filtered = 1)
  AND is_fetched = 0
`).get().c

console.log(`📦 عدد المسلسلات المحتاجة تعليم: ${seriesCount.toLocaleString()}`)

if (seriesCount > 0) {
  const result = db.prepare(`
    UPDATE tv_series
    SET is_fetched = 1, fetched_at = datetime('now'), fetched_from = 'tmdb'
    WHERE (overview_en IS NOT NULL OR is_filtered = 1)
    AND is_fetched = 0
  `).run()
  
  console.log(`✅ تم تعليم: ${result.changes.toLocaleString()} مسلسل`)
} else {
  console.log(`✅ جميع المسلسلات معلمة بالفعل`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3️⃣ الملخص
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n' + '═'.repeat(80))
console.log('📊 الملخص:')
console.log('═'.repeat(80))

const moviesFetched = db.prepare(`
  SELECT COUNT(*) as c FROM movies WHERE is_fetched = 1
`).get().c

const moviesNotFetched = db.prepare(`
  SELECT COUNT(*) as c FROM movies WHERE is_fetched = 0
`).get().c

const seriesFetched = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series WHERE is_fetched = 1
`).get().c

const seriesNotFetched = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series WHERE is_fetched = 0
`).get().c

console.log('\n🎬 الأفلام:')
console.log(`  ✅ معلمة (مسحوبة): ${moviesFetched.toLocaleString()}`)
console.log(`  ❌ غير معلمة (لم تُسحب): ${moviesNotFetched.toLocaleString()}`)

console.log('\n📺 المسلسلات:')
console.log(`  ✅ معلمة (مسحوبة): ${seriesFetched.toLocaleString()}`)
console.log(`  ❌ غير معلمة (لم تُسحب): ${seriesNotFetched.toLocaleString()}`)

console.log('\n📈 الإجمالي:')
const totalFetched = moviesFetched + seriesFetched
const totalNotFetched = moviesNotFetched + seriesNotFetched
const totalAll = totalFetched + totalNotFetched
const percentage = ((totalFetched / totalAll) * 100).toFixed(1)

console.log(`  ✅ معلمة (مسحوبة): ${totalFetched.toLocaleString()} (${percentage}%)`)
console.log(`  ❌ غير معلمة (لم تُسحب): ${totalNotFetched.toLocaleString()} (${(100 - percentage).toFixed(1)}%)`)
console.log(`  📦 الإجمالي: ${totalAll.toLocaleString()}`)

console.log('\n' + '═'.repeat(80))
console.log('✅ اكتمل تعليم الأعمال المسحوبة!\n')

db.close()
