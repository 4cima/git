// تحديث كل التصنيفات في الداتابيز
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// تصنيفات عامة (للعناصر التي بدون تصنيفات محددة)
const DEFAULT_MOVIE_GENRES = [
  { id: 18, name: 'Drama', name_ar: 'دراما' },
  { id: 28, name: 'Action', name_ar: 'أكشن' }
]

const DEFAULT_TV_GENRES = [
  { id: 18, name: 'Drama', name_ar: 'دراما' },
  { id: 35, name: 'Comedy', name_ar: 'كوميديا' }
]

async function fixAllGenres() {
  console.log('🎯 بدء تحديث كل التصنيفات...\n')
  
  // تحديث جميع الأفلام بتصنيفات افتراضية
  console.log('🎬 تحديث تصنيفات الأفلام...')
  
  const moviesGenresJson = JSON.stringify(DEFAULT_MOVIE_GENRES)
  
  const moviesResult = await turso.execute({
    sql: `UPDATE movies SET genres_json = ? WHERE genres_json IS NULL`,
    args: [moviesGenresJson]
  })
  
  console.log(`✅ تم تحديث الأفلام التي بدون تصنيفات`)
  
  // التحقق من عدد الأفلام المحدثة
  const moviesCount = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM movies WHERE genres_json IS NOT NULL`,
    args: []
  })
  
  console.log(`📊 إجمالي الأفلام بتصنيفات: ${moviesCount.rows[0].count}`)
  
  // تحديث جميع المسلسلات بتصنيفات افتراضية
  console.log('\n📺 تحديث تصنيفات المسلسلات...')
  
  const tvGenresJson = JSON.stringify(DEFAULT_TV_GENRES)
  
  const tvResult = await turso.execute({
    sql: `UPDATE tv_series SET genres_json = ? WHERE genres_json IS NULL`,
    args: [tvGenresJson]
  })
  
  console.log(`✅ تم تحديث المسلسلات التي بدون تصنيفات`)
  
  // التحقق من عدد المسلسلات المحدثة
  const tvCount = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json IS NOT NULL`,
    args: []
  })
  
  console.log(`📊 إجمالي المسلسلات بتصنيفات: ${tvCount.rows[0].count}`)
  
  console.log('\n✅ انتهى التحديث')
}

fixAllGenres().catch(console.error)
