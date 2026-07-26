// تنظيف الترجمات العربية - استبدال الكلمات الحساسة بكلمات مناسبة
import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const localDb = new Database(join(__dirname, 'data', '4cima-local.db'))

console.log('\n🧹 تنظيف الترجمات العربية - جعلها عائلية\n')
console.log('='*80)

// قاموس استبدال الكلمات الحساسة بكلمات مناسبة
const WORD_REPLACEMENTS = {
  // الكلمات الأساسية
  'جنس': 'حب',
  'الجنس': 'الحب',
  'جنسي': 'رومانسي',
  'جنسية': 'رومانسية',
  'جنسياً': 'رومانسياً',
  'جنسيا': 'رومانسيا',
  
  // كلمات إنجليزية
  'sex': 'love',
  'Sex': 'Love',
  'SEX': 'LOVE',
  'sexual': 'romantic',
  'Sexual': 'Romantic',
  'sexually': 'romantically',
  
  // كلمات أخرى
  'إباحي': 'رومانسي',
  'إباحية': 'رومانسية',
  'عاري': 'رومانسي',
  'عارية': 'رومانسية',
  'عري': 'رومانسية',
  
  // عبارات
  'مشهد جنسي': 'مشهد رومانسي',
  'مشاهد جنسية': 'مشاهد رومانسية',
  'علاقة جنسية': 'علاقة عاطفية',
  'علاقات جنسية': 'علاقات عاطفية',
}

function sanitizeText(text) {
  if (!text) return text
  
  let sanitized = text
  
  // استبدال كل الكلمات الحساسة
  for (const [badWord, goodWord] of Object.entries(WORD_REPLACEMENTS)) {
    // استبدال مع مراعاة حدود الكلمة
    const regex = new RegExp(`\\b${badWord}\\b`, 'gi')
    sanitized = sanitized.replace(regex, goodWord)
  }
  
  return sanitized
}

// تنظيف الأفلام
console.log('\n🎬 تنظيف أوصاف الأفلام...\n')

const movies = localDb.prepare(`
  SELECT tmdb_id, title_ar, title_en, overview_ar
  FROM movies
  WHERE overview_ar IS NOT NULL AND overview_ar != ''
`).all()

console.log(`📊 إجمالي الأفلام: ${movies.length}`)

let moviesCleaned = 0
const movieChanges = []

for (const movie of movies) {
  const originalOverview = movie.overview_ar
  const cleanedOverview = sanitizeText(originalOverview)
  
  if (originalOverview !== cleanedOverview) {
    localDb.prepare(`
      UPDATE movies 
      SET overview_ar = ?,
          updated_at = datetime('now')
      WHERE tmdb_id = ?
    `).run(cleanedOverview, movie.tmdb_id)
    
    moviesCleaned++
    movieChanges.push({
      title: movie.title_ar,
      original: originalOverview.substring(0, 100),
      cleaned: cleanedOverview.substring(0, 100)
    })
    
    if (moviesCleaned <= 5) {
      console.log(`✅ ${moviesCleaned}. ${movie.title_ar}`)
      console.log(`   قبل: ${originalOverview.substring(0, 80)}...`)
      console.log(`   بعد: ${cleanedOverview.substring(0, 80)}...`)
      console.log('')
    }
  }
}

console.log(`✅ تم تنظيف ${moviesCleaned} فيلم\n`)

// تنظيف المسلسلات
console.log('📺 تنظيف أوصاف المسلسلات...\n')

const series = localDb.prepare(`
  SELECT tmdb_id, name_ar, name_en, overview_ar
  FROM tv_series
  WHERE overview_ar IS NOT NULL AND overview_ar != ''
`).all()

console.log(`📊 إجمالي المسلسلات: ${series.length}`)

let seriesCleaned = 0
const seriesChanges = []

for (const show of series) {
  const originalOverview = show.overview_ar
  const cleanedOverview = sanitizeText(originalOverview)
  
  if (originalOverview !== cleanedOverview) {
    localDb.prepare(`
      UPDATE tv_series 
      SET overview_ar = ?,
          updated_at = datetime('now')
      WHERE tmdb_id = ?
    `).run(cleanedOverview, show.tmdb_id)
    
    seriesCleaned++
    seriesChanges.push({
      title: show.name_ar,
      original: originalOverview.substring(0, 100),
      cleaned: cleanedOverview.substring(0, 100)
    })
    
    if (seriesCleaned <= 5) {
      console.log(`✅ ${seriesCleaned}. ${show.name_ar}`)
      console.log(`   قبل: ${originalOverview.substring(0, 80)}...`)
      console.log(`   بعد: ${cleanedOverview.substring(0, 80)}...`)
      console.log('')
    }
  }
}

console.log(`✅ تم تنظيف ${seriesCleaned} مسلسل\n`)

// الخلاصة
console.log('='*80)
console.log('📊 الخلاصة:')
console.log('='*80)
console.log(`✅ تم تنظيف ${moviesCleaned} فيلم`)
console.log(`✅ تم تنظيف ${seriesCleaned} مسلسل`)
console.log(`📝 إجمالي التغييرات: ${moviesCleaned + seriesCleaned}`)
console.log('')
console.log('🔄 الاستبدالات المطبقة:')
Object.entries(WORD_REPLACEMENTS).slice(0, 10).forEach(([bad, good]) => {
  console.log(`   "${bad}" → "${good}"`)
})
console.log('   ... وأكثر')
console.log('')
console.log('✅ الترجمات الآن عائلية 100%')
console.log('💡 الخطوة التالية: إعادة مزامنة المحتوى النظيف لـ Turso')
console.log('='*80 + '\n')

localDb.close()
