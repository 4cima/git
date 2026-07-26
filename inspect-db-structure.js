// فحص البنية الفعلية لقاعدة البيانات
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function inspectDatabase() {
  console.log('🔍 فحص البنية الفعلية لقاعدة البيانات\n')
  console.log('='*80)
  
  // 1. فحص هيكل جدول الأفلام
  console.log('\n📋 هيكل جدول MOVIES:')
  const moviesSchema = await turso.execute({
    sql: `PRAGMA table_info(movies)`,
    args: []
  })
  console.log('الأعمدة المتاحة:')
  moviesSchema.rows.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`)
  })
  
  // 2. فحص عينة من الأفلام مع كل البيانات
  console.log('\n\n🎬 عينة من 5 أفلام مع كل البيانات:')
  console.log('='*80)
  const movies = await turso.execute({
    sql: `SELECT * FROM movies LIMIT 5`,
    args: []
  })
  
  movies.rows.forEach((movie, idx) => {
    console.log(`\n📽️ فيلم #${idx + 1}:`)
    console.log('-'.repeat(60))
    Object.keys(movie).forEach(key => {
      const value = movie[key]
      if (value !== null && value !== '') {
        console.log(`  ${key}: ${String(value).substring(0, 100)}${String(value).length > 100 ? '...' : ''}`)
      }
    })
  })
  
  // 3. فحص هيكل جدول المسلسلات
  console.log('\n\n📋 هيكل جدول TV_SERIES:')
  const tvSchema = await turso.execute({
    sql: `PRAGMA table_info(tv_series)`,
    args: []
  })
  console.log('الأعمدة المتاحة:')
  tvSchema.rows.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`)
  })
  
  // 4. فحص عينة من المسلسلات مع كل البيانات
  console.log('\n\n📺 عينة من 5 مسلسلات مع كل البيانات:')
  console.log('='*80)
  const series = await turso.execute({
    sql: `SELECT * FROM tv_series LIMIT 5`,
    args: []
  })
  
  series.rows.forEach((show, idx) => {
    console.log(`\n📺 مسلسل #${idx + 1}:`)
    console.log('-'.repeat(60))
    Object.keys(show).forEach(key => {
      const value = show[key]
      if (value !== null && value !== '') {
        console.log(`  ${key}: ${String(value).substring(0, 100)}${String(value).length > 100 ? '...' : ''}`)
      }
    })
  })
  
  // 5. إحصائيات عامة
  console.log('\n\n📊 إحصائيات عامة:')
  console.log('='*80)
  
  const movieStats = await turso.execute({
    sql: `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN genres_json IS NOT NULL THEN 1 ELSE 0 END) as with_genres,
            SUM(CASE WHEN poster_path IS NOT NULL THEN 1 ELSE 0 END) as with_poster,
            SUM(CASE WHEN backdrop_path IS NOT NULL THEN 1 ELSE 0 END) as with_backdrop,
            SUM(CASE WHEN overview_ar IS NOT NULL THEN 1 ELSE 0 END) as with_overview
          FROM movies`,
    args: []
  })
  
  console.log('\n🎬 الأفلام:')
  console.log(`  إجمالي: ${movieStats.rows[0].total}`)
  console.log(`  مع تصنيفات: ${movieStats.rows[0].with_genres}`)
  console.log(`  مع بوستر: ${movieStats.rows[0].with_poster}`)
  console.log(`  مع باكدروب: ${movieStats.rows[0].with_backdrop}`)
  console.log(`  مع وصف عربي: ${movieStats.rows[0].with_overview}`)
  
  const tvStats = await turso.execute({
    sql: `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN genres_json IS NOT NULL THEN 1 ELSE 0 END) as with_genres,
            SUM(CASE WHEN poster_path IS NOT NULL THEN 1 ELSE 0 END) as with_poster,
            SUM(CASE WHEN backdrop_path IS NOT NULL THEN 1 ELSE 0 END) as with_backdrop,
            SUM(CASE WHEN overview_ar IS NOT NULL THEN 1 ELSE 0 END) as with_overview
          FROM tv_series`,
    args: []
  })
  
  console.log('\n📺 المسلسلات:')
  console.log(`  إجمالي: ${tvStats.rows[0].total}`)
  console.log(`  مع تصنيفات: ${tvStats.rows[0].with_genres}`)
  console.log(`  مع بوستر: ${tvStats.rows[0].with_poster}`)
  console.log(`  مع باكدروب: ${tvStats.rows[0].with_backdrop}`)
  console.log(`  مع وصف عربي: ${tvStats.rows[0].with_overview}`)
  
  console.log('\n✅ انتهى الفحص')
}

inspectDatabase().catch(console.error)
