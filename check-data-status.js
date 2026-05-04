const db = require('better-sqlite3')('./data/4cima-local.db')

console.log('🔍 فحص البيانات الفعلية:\n')

// فحص الأفلام
const moviesStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(overview_en) as with_overview_en,
    COUNT(title_en) as with_title_en,
    COUNT(CASE WHEN is_filtered = 1 THEN 1 END) as filtered,
    COUNT(CASE WHEN is_fetched = 1 THEN 1 END) as fetched
  FROM movies
`).get()

console.log('🎬 الأفلام:')
console.log(`  إجمالي: ${moviesStats.total.toLocaleString()}`)
console.log(`  مع overview_en: ${moviesStats.with_overview_en.toLocaleString()}`)
console.log(`  مع title_en: ${moviesStats.with_title_en.toLocaleString()}`)
console.log(`  مفلترة: ${moviesStats.filtered.toLocaleString()}`)
console.log(`  معلمة (is_fetched=1): ${moviesStats.fetched.toLocaleString()}`)

// فحص المسلسلات
const seriesStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(overview_en) as with_overview_en,
    COUNT(title_en) as with_title_en,
    COUNT(CASE WHEN is_filtered = 1 THEN 1 END) as filtered,
    COUNT(CASE WHEN is_fetched = 1 THEN 1 END) as fetched
  FROM tv_series
`).get()

console.log('\n📺 المسلسلات:')
console.log(`  إجمالي: ${seriesStats.total.toLocaleString()}`)
console.log(`  مع overview_en: ${seriesStats.with_overview_en.toLocaleString()}`)
console.log(`  مع title_en: ${seriesStats.with_title_en.toLocaleString()}`)
console.log(`  مفلترة: ${seriesStats.filtered.toLocaleString()}`)
console.log(`  معلمة (is_fetched=1): ${seriesStats.fetched.toLocaleString()}`)

db.close()
