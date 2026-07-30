const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function main() {
  console.log('\n=== 1. فحص الأفلام الفاشلة (original_language = NULL) ===\n')
  
  const nullLangResult = await turso.execute({
    sql: 'SELECT tmdb_id, title_en FROM movies WHERE original_language IS NULL',
    args: []
  })
  
  if (nullLangResult.rows.length === 0) {
    console.log('✅ لا توجد أفلام بـ original_language = NULL (كل الأفلام تم تحديثها بنجاح)')
  } else {
    console.log(`❌ يوجد ${nullLangResult.rows.length} فيلم فاشل:`)
    nullLangResult.rows.forEach(row => {
      console.log(`  - tmdb_id: ${row.tmdb_id}, title: ${row.title_en}`)
    })
  }

  console.log('\n=== 2. فحص جودة JSON columns (3 أفلام من النطاق الأخير) ===\n')
  
  // الـ sync وصل ~152,900 - ناخد 3 أفلام من حوالين 150,000
  const recentMovies = await turso.execute({
    sql: `SELECT tmdb_id, title_en, genres_json, cast_json, countries_json, keywords_json, companies_json, original_language
          FROM movies 
          WHERE tmdb_id >= 150000 AND tmdb_id <= 152000
          LIMIT 3`,
    args: []
  })
  
  if (recentMovies.rows.length === 0) {
    console.log('⚠️ لا توجد أفلام في نطاق 150000-152000 (ممكن الـ sync لسه مووصلش)')
    // نجرب نطاق أقل
    const fallbackMovies = await turso.execute({
      sql: `SELECT tmdb_id, title_en, genres_json, cast_json, countries_json, keywords_json, companies_json, original_language
            FROM movies 
            ORDER BY tmdb_id DESC
            LIMIT 3`,
      args: []
    })
    
    console.log(`\nآخر 3 أفلام في Turso حالياً:\n`)
    fallbackMovies.rows.forEach((row, idx) => {
      console.log(`\n--- فيلم ${idx + 1}: ${row.title_en} (tmdb_id: ${row.tmdb_id}) ---`)
      console.log(`original_language: ${row.original_language || 'NULL'}`)
      console.log(`genres_json: ${row.genres_json ? row.genres_json.substring(0, 100) + '...' : 'NULL أو فاضي'}`)
      console.log(`cast_json: ${row.cast_json ? row.cast_json.substring(0, 100) + '...' : 'NULL أو فاضي'}`)
      console.log(`countries_json: ${row.countries_json || 'NULL أو فاضي'}`)
      console.log(`keywords_json: ${row.keywords_json ? row.keywords_json.substring(0, 80) + '...' : 'NULL أو فاضي'}`)
      console.log(`companies_json: ${row.companies_json ? row.companies_json.substring(0, 80) + '...' : 'NULL أو فاضي'}`)
    })
  } else {
    console.log(`وجدنا ${recentMovies.rows.length} أفلام من النطاق 150000-152000:\n`)
    recentMovies.rows.forEach((row, idx) => {
      console.log(`\n--- فيلم ${idx + 1}: ${row.title_en} (tmdb_id: ${row.tmdb_id}) ---`)
      console.log(`original_language: ${row.original_language || 'NULL'}`)
      console.log(`genres_json: ${row.genres_json ? row.genres_json.substring(0, 100) + '...' : 'NULL أو فاضي'}`)
      console.log(`cast_json: ${row.cast_json ? row.cast_json.substring(0, 100) + '...' : 'NULL أو فاضي'}`)
      console.log(`countries_json: ${row.countries_json || 'NULL أو فاضي'}`)
      console.log(`keywords_json: ${row.keywords_json ? row.keywords_json.substring(0, 80) + '...' : 'NULL أو فاضي'}`)
      console.log(`companies_json: ${row.companies_json ? row.companies_json.substring(0, 80) + '...' : 'NULL أو فاضي'}`)
      
      // نتحقق من صحة الـ JSON
      try {
        if (row.genres_json) {
          const genres = JSON.parse(row.genres_json)
          console.log(`  ✅ genres_json valid (${genres.length} تصنيف)`)
        }
        if (row.cast_json) {
          const cast = JSON.parse(row.cast_json)
          console.log(`  ✅ cast_json valid (${cast.length} ممثل)`)
        }
        if (row.countries_json) {
          const countries = JSON.parse(row.countries_json)
          console.log(`  ✅ countries_json valid (${countries.length} دولة)`)
        }
        if (row.keywords_json) {
          const keywords = JSON.parse(row.keywords_json)
          console.log(`  ✅ keywords_json valid (${keywords.length} كلمة)`)
        }
        if (row.companies_json) {
          const companies = JSON.parse(row.companies_json)
          console.log(`  ✅ companies_json valid (${companies.length} شركة)`)
        }
      } catch (e) {
        console.log(`  ❌ خطأ في parsing JSON: ${e.message}`)
      }
    })
  }
  
  console.log('\n=== 3. إحصائيات عامة ===\n')
  const statsResult = await turso.execute({
    sql: `SELECT 
            COUNT(*) as total,
            COUNT(original_language) as has_lang,
            COUNT(genres_json) as has_genres,
            COUNT(cast_json) as has_cast
          FROM movies`,
    args: []
  })
  
  const stats = statsResult.rows[0]
  console.log(`إجمالي الأفلام: ${stats.total}`)
  console.log(`لديها original_language: ${stats.has_lang} (${((stats.has_lang/stats.total)*100).toFixed(1)}%)`)
  console.log(`لديها genres_json: ${stats.has_genres} (${((stats.has_genres/stats.total)*100).toFixed(1)}%)`)
  console.log(`لديها cast_json: ${stats.has_cast} (${((stats.has_cast/stats.total)*100).toFixed(1)}%)`)
  
  console.log('\n✅ الفحص اكتمل\n')
}

main().catch(console.error)
