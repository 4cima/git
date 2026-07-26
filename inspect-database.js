// Comprehensive Database Inspection
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function inspectDatabase() {
  try {
    console.log('═══════════════════════════════════════════════════════════')
    console.log('              بنية قاعدة البيانات الكاملة')
    console.log('═══════════════════════════════════════════════════════════\n')

    // 1. Get all tables
    console.log('📋 الجداول الموجودة في قاعدة البيانات:\n')
    const tablesResult = await turso.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      args: []
    })
    
    const tables = tablesResult.rows.map(r => r.name)
    console.log(`عدد الجداول: ${tables.length}\n`)
    
    // 2. Get structure for each table
    for (const tableName of tables) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📊 جدول: ${tableName}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
      
      // Get columns
      const columnsResult = await turso.execute({
        sql: `PRAGMA table_info(${tableName})`,
        args: []
      })
      
      console.log('الأعمدة:')
      columnsResult.rows.forEach(col => {
        const nullable = col.notnull === 0 ? 'NULL' : 'NOT NULL'
        const pk = col.pk > 0 ? ' [PRIMARY KEY]' : ''
        const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''
        console.log(`  • ${col.name} - ${col.type} ${nullable}${defaultVal}${pk}`)
      })
      
      // Get row count
      const countResult = await turso.execute({
        sql: `SELECT COUNT(*) as count FROM ${tableName}`,
        args: []
      })
      console.log(`\nعدد الصفوف: ${countResult.rows[0].count}`)
    }

    console.log('\n\n═══════════════════════════════════════════════════════════')
    console.log('           بيانات 10 أعمال من الـ Hero Section')
    console.log('═══════════════════════════════════════════════════════════\n')

    // 3. Get Hero Items (Trending Movies)
    const heroMovies = await turso.execute({
      sql: `SELECT * FROM movies 
            WHERE poster_path IS NOT NULL AND vote_average > 0
            ORDER BY popularity DESC 
            LIMIT 5`,
      args: []
    })

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎬 أفلام الـ Hero (5 أفلام الأكثر شعبية)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    heroMovies.rows.forEach((movie, i) => {
      console.log(`\n▶ فيلم ${i + 1}:`)
      console.log(`   ID: ${movie.id}`)
      console.log(`   Slug: ${movie.slug}`)
      console.log(`   العنوان بالعربي: ${movie.title_ar || 'غير متوفر'}`)
      console.log(`   العنوان بالإنجليزي: ${movie.title_en || 'غير متوفر'}`)
      console.log(`   التقييم: ${movie.vote_average}`)
      console.log(`   عدد التقييمات: ${movie.vote_count}`)
      console.log(`   الشعبية: ${movie.popularity}`)
      console.log(`   سنة الإصدار: ${movie.release_year || 'غير متوفر'}`)
      console.log(`   الملصق: ${movie.poster_path}`)
      console.log(`   الخلفية: ${movie.backdrop_path || 'غير متوفر'}`)
      console.log(`   التصنيفات (JSON): ${movie.genres_json ? movie.genres_json.substring(0, 150) + '...' : 'غير متوفر'}`)
      console.log(`   نظرة عامة بالعربي: ${movie.overview_ar ? movie.overview_ar.substring(0, 100) + '...' : 'غير متوفر'}`)
    })

    // 4. Get Hero Series
    const heroSeries = await turso.execute({
      sql: `SELECT * FROM tv_series 
            WHERE poster_path IS NOT NULL AND vote_average > 0
            ORDER BY popularity DESC 
            LIMIT 5`,
      args: []
    })

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📺 مسلسلات الـ Hero (5 مسلسلات الأكثر شعبية)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    heroSeries.rows.forEach((series, i) => {
      console.log(`\n▶ مسلسل ${i + 1}:`)
      console.log(`   ID: ${series.id}`)
      console.log(`   Slug: ${series.slug}`)
      console.log(`   الاسم بالعربي: ${series.name_ar || 'غير متوفر'}`)
      console.log(`   الاسم بالإنجليزي: ${series.name_en || 'غير متوفر'}`)
      console.log(`   التقييم: ${series.vote_average}`)
      console.log(`   عدد التقييمات: ${series.vote_count}`)
      console.log(`   الشعبية: ${series.popularity}`)
      console.log(`   سنة البداية: ${series.first_air_year || 'غير متوفر'}`)
      console.log(`   الملصق: ${series.poster_path}`)
      console.log(`   الخلفية: ${series.backdrop_path || 'غير متوفر'}`)
      console.log(`   التصنيفات (JSON): ${series.genres_json ? series.genres_json.substring(0, 150) + '...' : 'غير متوفر'}`)
      console.log(`   نظرة عامة بالعربي: ${series.overview_ar ? series.overview_ar.substring(0, 100) + '...' : 'غير متوفر'}`)
      console.log(`   عدد المواسم: ${series.number_of_seasons || 'غير متوفر'}`)
      console.log(`   الحالة: ${series.status || 'غير متوفر'}`)
    })

    console.log('\n\n═══════════════════════════════════════════════════════════')
    console.log('              آلية سحب البيانات للموقع')
    console.log('═══════════════════════════════════════════════════════════\n')

    console.log('📌 مسار البيانات من قاعدة البيانات إلى الموقع:\n')
    console.log('1️⃣  قاعدة البيانات (Turso - SQLite)')
    console.log('   └─ الجداول: movies, tv_series, etc.')
    console.log('')
    console.log('2️⃣  API Routes (Next.js)')
    console.log('   ├─ /api/home → src/app/api/home/route.ts')
    console.log('   ├─ /api/movies → src/app/api/movies/route.ts')
    console.log('   └─ /api/series → src/app/api/series/route.ts')
    console.log('')
    console.log('3️⃣  Data Processing (src/lib/homeData.ts)')
    console.log('   ├─ extractGenre() → استخراج التصنيف من genres_json')
    console.log('   └─ mapItems() → تحويل البيانات للشكل المطلوب')
    console.log('')
    console.log('4️⃣  React Components')
    console.log('   ├─ src/app/page.tsx → الصفحة الرئيسية')
    console.log('   ├─ src/components/sections/HeroSection.tsx → قسم الـ Hero')
    console.log('   └─ src/components/features/media/MovieCard.tsx → الكارت')
    console.log('')
    console.log('5️⃣  العرض في المتصفح 🌐')

  } catch (error) {
    console.error('❌ خطأ:', error)
  }
}

inspectDatabase()
