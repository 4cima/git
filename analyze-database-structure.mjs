import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function analyzeDatabase() {
  console.log('\n📊 تحليل بنية قاعدة البيانات Turso\n')
  console.log('='.repeat(70))
  
  // Get all tables
  const tablesResult = await turso.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  })
  
  const tables = tablesResult.rows.map(r => r.name)
  
  console.log('\n📋 الجداول الموجودة:\n')
  
  for (const tableName of tables) {
    // Get row count
    const countResult = await turso.execute(`SELECT COUNT(*) as cnt FROM ${tableName}`)
    const count = countResult.rows[0].cnt
    
    // Get schema
    const schemaResult = await turso.execute(`PRAGMA table_info(${tableName})`)
    const columns = schemaResult.rows
    
    console.log(`\n📦 ${tableName}`)
    console.log(`   عدد السجلات: ${count.toLocaleString()}`)
    console.log(`   الأعمدة (${columns.length}):`)
    
    // Show key columns only
    const keyColumns = columns.filter(col => 
      ['id', 'tmdb_id', 'slug', 'title', 'name', 'title_ar', 'name_ar', 'type', 'status', 'created_at'].some(key => 
        col.name.toLowerCase().includes(key.toLowerCase())
      )
    ).slice(0, 8)
    
    keyColumns.forEach(col => {
      console.log(`      - ${col.name} (${col.type})`)
    })
    
    if (columns.length > keyColumns.length) {
      console.log(`      ... و ${columns.length - keyColumns.length} عمود آخر`)
    }
  }
  
  // Sample data analysis
  console.log('\n' + '='.repeat(70))
  console.log('\n📊 تحليل البيانات:\n')
  
  // Movies analysis
  if (tables.includes('movies')) {
    const moviesStats = await turso.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT release_year) as years,
        MIN(release_year) as oldest_year,
        MAX(release_year) as newest_year,
        AVG(vote_average) as avg_rating,
        COUNT(CASE WHEN poster_path IS NOT NULL THEN 1 END) as with_posters
      FROM movies
    `)
    
    const stats = moviesStats.rows[0]
    console.log('🎬 الأفلام:')
    console.log(`   - إجمالي: ${stats.total.toLocaleString()}`)
    console.log(`   - نطاق السنوات: ${stats.oldest_year} - ${stats.newest_year}`)
    console.log(`   - عدد السنوات المختلفة: ${stats.years}`)
    console.log(`   - متوسط التقييم: ${Number(stats.avg_rating).toFixed(2)}`)
    console.log(`   - بها ملصقات: ${stats.with_posters.toLocaleString()} (${(stats.with_posters/stats.total*100).toFixed(1)}%)`)
    
    // Top countries
    const countriesResult = await turso.execute(`
      SELECT country_of_origin, COUNT(*) as cnt 
      FROM movies 
      WHERE country_of_origin IS NOT NULL 
      GROUP BY country_of_origin 
      ORDER BY cnt DESC 
      LIMIT 10
    `)
    console.log(`   - أعلى 10 دول:`)
    countriesResult.rows.forEach(row => {
      console.log(`      ${row.country_of_origin}: ${row.cnt.toLocaleString()}`)
    })
  }
  
  // Series analysis
  if (tables.includes('tv_series')) {
    const seriesStats = await turso.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT first_air_year) as years,
        MIN(first_air_year) as oldest_year,
        MAX(first_air_year) as newest_year,
        AVG(vote_average) as avg_rating,
        SUM(number_of_seasons) as total_seasons,
        SUM(number_of_episodes) as total_episodes
      FROM tv_series
    `)
    
    const stats = seriesStats.rows[0]
    console.log('\n📺 المسلسلات:')
    console.log(`   - إجمالي: ${stats.total.toLocaleString()}`)
    console.log(`   - نطاق السنوات: ${stats.oldest_year} - ${stats.newest_year}`)
    console.log(`   - عدد السنوات المختلفة: ${stats.years}`)
    console.log(`   - متوسط التقييم: ${Number(stats.avg_rating).toFixed(2)}`)
    console.log(`   - إجمالي المواسم: ${stats.total_seasons?.toLocaleString() || 'N/A'}`)
    console.log(`   - إجمالي الحلقات: ${stats.total_episodes?.toLocaleString() || 'N/A'}`)
  }
  
  // Genres analysis
  if (tables.includes('genres')) {
    const genresResult = await turso.execute('SELECT COUNT(*) as cnt FROM genres')
    console.log(`\n🎭 التصنيفات: ${genresResult.rows[0].cnt}`)
    
    const genresList = await turso.execute('SELECT name_ar, name_en, slug FROM genres ORDER BY name_ar')
    console.log('   القائمة:')
    genresList.rows.forEach(g => {
      console.log(`      - ${g.name_ar} (${g.name_en}) → /genres/${g.slug}`)
    })
  }
  
  // People (Cast/Crew) analysis
  if (tables.includes('people')) {
    const peopleResult = await turso.execute('SELECT COUNT(*) as cnt FROM people')
    console.log(`\n👥 الأشخاص (ممثلين، مخرجين، إلخ): ${peopleResult.rows[0].cnt.toLocaleString()}`)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ اكتمل التحليل\n')
}

analyzeDatabase().catch(console.error)
