// عرض بنية قاعدة بيانات Turso بشكل مبسط
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function showStructure() {
  console.log('\n' + '═'.repeat(80))
  console.log('             🗄️  بنية قاعدة بيانات Turso - مشروع 4CIMA')
  console.log('═'.repeat(80) + '\n')

  // Database info
  console.log('📌 معلومات الاتصال:')
  console.log(`   النوع: Turso (libSQL - SQLite Cloud)`)
  console.log(`   الموقع: ${process.env.TURSO_DATABASE_URL}`)
  console.log(`   المنطقة: AWS EU West 1 (إيرلندا)\n`)

  // Get all tables
  const tablesResult = await turso.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    args: []
  })

  console.log('━'.repeat(80))
  console.log('📋 الجداول في قاعدة البيانات\n')

  const tables = []
  for (const table of tablesResult.rows) {
    const name = table.name
    
    // Get count
    const countResult = await turso.execute({
      sql: `SELECT COUNT(*) as cnt FROM ${name}`,
      args: []
    })
    const count = countResult.rows[0].cnt
    
    // Get columns
    const colsResult = await turso.execute({
      sql: `PRAGMA table_info(${name})`,
      args: []
    })
    
    tables.push({
      name,
      count,
      columns: colsResult.rows.length
    })
  }

  // Display tables
  console.log('┌────┬───────────────────────┬─────────────┬──────────┐')
  console.log('│ #  │ اسم الجدول            │ عدد الصفوف  │ الأعمدة   │')
  console.log('├────┼───────────────────────┼─────────────┼──────────┤')
  
  tables.forEach((table, i) => {
    const num = String(i + 1).padStart(2)
    const name = table.name.padEnd(21)
    const count = String(table.count).padStart(11)
    const cols = String(table.columns).padStart(8)
    console.log(`│ ${num} │ ${name} │ ${count} │ ${cols} │`)
  })
  
  console.log('└────┴───────────────────────┴─────────────┴──────────┘\n')

  // Detailed info for main tables
  console.log('━'.repeat(80))
  console.log('🎬 تفاصيل الجداول الرئيسية\n')

  // Movies table
  const moviesColumns = await turso.execute({
    sql: 'PRAGMA table_info(movies)',
    args: []
  })

  console.log('┌─ movies ─────────────────────────────────────────────┐\n')
  console.log('  الأعمدة الأساسية:\n')
  
  const importantCols = ['id', 'slug', 'title_ar', 'title_en', 'poster_path', 
                        'backdrop_path', 'release_year', 'vote_average', 
                        'vote_count', 'popularity', 'genres_json']
  
  moviesColumns.rows
    .filter(col => importantCols.includes(col.name))
    .forEach(col => {
      const pk = col.pk > 0 ? ' [PK]' : ''
      const nn = col.notnull === 1 ? ' NOT NULL' : ''
      console.log(`    • ${col.name.padEnd(20)} ${col.type.padEnd(15)}${nn}${pk}`)
    })

  console.log(`\n  + ${moviesColumns.rows.length - importantCols.length} أعمدة أخرى (cast, countries, keywords, seo, etc.)`)
  console.log('\n└──────────────────────────────────────────────────────┘\n')

  // TV Series table
  const seriesColumns = await turso.execute({
    sql: 'PRAGMA table_info(tv_series)',
    args: []
  })

  console.log('┌─ tv_series ──────────────────────────────────────────┐\n')
  console.log('  الأعمدة الأساسية:\n')
  
  const importantSeriesCols = ['id', 'slug', 'name_ar', 'name_en', 'poster_path', 
                               'backdrop_path', 'first_air_year', 'vote_average', 
                               'number_of_seasons', 'status', 'genres_json']
  
  seriesColumns.rows
    .filter(col => importantSeriesCols.includes(col.name))
    .forEach(col => {
      const pk = col.pk > 0 ? ' [PK]' : ''
      const nn = col.notnull === 1 ? ' NOT NULL' : ''
      console.log(`    • ${col.name.padEnd(20)} ${col.type.padEnd(15)}${nn}${pk}`)
    })

  console.log(`\n  + ${seriesColumns.rows.length - importantSeriesCols.length} أعمدة أخرى (seasons, episodes, networks, etc.)`)
  console.log('\n└──────────────────────────────────────────────────────┘\n')

  // Genres table
  console.log('┌─ genres ─────────────────────────────────────────────┐\n')
  console.log('  الأعمدة:\n')
  
  const genresColumns = await turso.execute({
    sql: 'PRAGMA table_info(genres)',
    args: []
  })
  
  genresColumns.rows.forEach(col => {
    const pk = col.pk > 0 ? ' [PK]' : ''
    const nn = col.notnull === 1 ? ' NOT NULL' : ''
    console.log(`    • ${col.name.padEnd(20)} ${col.type.padEnd(15)}${nn}${pk}`)
  })
  
  console.log('\n  عينة من التصنيفات:\n')
  
  const genresSample = await turso.execute({
    sql: 'SELECT id, name_ar, name_en, slug FROM genres ORDER BY id LIMIT 8',
    args: []
  })
  
  genresSample.rows.forEach(g => {
    console.log(`    ${String(g.id).padStart(4)} - ${g.name_ar.padEnd(15)} (${g.name_en})`)
  })
  
  console.log('\n└──────────────────────────────────────────────────────┘\n')

  // Data quality stats
  console.log('━'.repeat(80))
  console.log('📊 إحصائيات جودة البيانات\n')

  // Movies with genres
  const moviesWithGenres = await turso.execute({
    sql: 'SELECT COUNT(*) as cnt FROM movies WHERE genres_json IS NOT NULL',
    args: []
  })
  const moviesTotal = await turso.execute({
    sql: 'SELECT COUNT(*) as cnt FROM movies',
    args: []
  })
  
  const withGenres = moviesWithGenres.rows[0].cnt
  const total = moviesTotal.rows[0].cnt
  const percentage = ((withGenres / total) * 100).toFixed(1)
  
  console.log('الأفلام:')
  console.log(`  إجمالي الأفلام: ${total.toLocaleString()}`)
  console.log(`  أفلام بها تصنيفات: ${withGenres.toLocaleString()} (${percentage}%)`)
  console.log(`  أفلام بدون تصنيفات: ${(total - withGenres).toLocaleString()} (${(100 - percentage).toFixed(1)}%)`)

  // Movies with backdrops
  const moviesWithBackdrop = await turso.execute({
    sql: 'SELECT COUNT(*) as cnt FROM movies WHERE backdrop_path IS NOT NULL',
    args: []
  })
  const withBackdrop = moviesWithBackdrop.rows[0].cnt
  const backdropPercentage = ((withBackdrop / total) * 100).toFixed(1)
  
  console.log(`  أفلام بها backdrop: ${withBackdrop.toLocaleString()} (${backdropPercentage}%)`)

  // Series stats
  const seriesTotal = await turso.execute({
    sql: 'SELECT COUNT(*) as cnt FROM tv_series',
    args: []
  })
  
  const seriesWithGenres = await turso.execute({
    sql: 'SELECT COUNT(*) as cnt FROM tv_series WHERE genres_json IS NOT NULL',
    args: []
  })
  
  console.log('\nالمسلسلات:')
  console.log(`  إجمالي المسلسلات: ${seriesTotal.rows[0].cnt.toLocaleString()}`)
  console.log(`  مسلسلات بها تصنيفات: ${seriesWithGenres.rows[0].cnt.toLocaleString()}`)

  // Sample movie data
  console.log('\n' + '━'.repeat(80))
  console.log('🎥 عينة من بيانات الأفلام\n')

  const sampleMovie = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, release_year, vote_average, 
                 popularity, genres_json
          FROM movies 
          WHERE genres_json IS NOT NULL AND poster_path IS NOT NULL
          ORDER BY popularity DESC 
          LIMIT 3`,
    args: []
  })

  sampleMovie.rows.forEach((movie, i) => {
    console.log(`${i + 1}. ${movie.title_ar} (${movie.title_en})`)
    console.log(`   ID: ${movie.id} | Slug: ${movie.slug}`)
    console.log(`   السنة: ${movie.release_year} | التقييم: ${movie.vote_average} | الشعبية: ${movie.popularity}`)
    
    // Parse genres
    try {
      const genres = JSON.parse(movie.genres_json)
      const genreNames = genres.map(g => g.name_ar).join(', ')
      console.log(`   التصنيفات: ${genreNames}`)
    } catch (e) {
      console.log(`   التصنيفات: خطأ في التحليل`)
    }
    console.log()
  })

  console.log('═'.repeat(80))
  console.log('\n✅ تم عرض بنية قاعدة البيانات بنجاح!\n')
}

showStructure().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
