require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

;(async () => {
  try {
    console.log('\n📊 محاكاة نفس Promise.all اللي في /api/home\n')
    console.log('─'.repeat(60))
    
    // نفس الـ 5 queries بالظبط زي /api/home
    const queries = [
      // Q1: Trending Movies
      `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
       FROM movies 
       WHERE poster_path IS NOT NULL 
         AND backdrop_path IS NOT NULL 
         AND vote_average > 0
       ORDER BY popularity DESC 
       LIMIT 50`,
      
      // Q2: Trending Series
      `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
       FROM tv_series 
       WHERE poster_path IS NOT NULL 
         AND backdrop_path IS NOT NULL 
         AND vote_average > 0
       ORDER BY popularity DESC 
       LIMIT 50`,
      
      // Q3: Latest Movies
      `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
       FROM movies 
       WHERE poster_path IS NOT NULL
       ORDER BY release_year DESC, popularity DESC
       LIMIT 50`,
      
      // Q4: Top Rated
      `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
       FROM movies 
       WHERE poster_path IS NOT NULL 
         AND vote_average >= 7.5
       ORDER BY vote_average DESC
       LIMIT 50`,
      
      // Q5: Popular Series
      `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, overview_ar, first_air_year as year, vote_average, genres_json
       FROM tv_series 
       WHERE poster_path IS NOT NULL
       ORDER BY popularity DESC
       LIMIT 50`
    ]
    
    // قياس 3 مرات
    const times = []
    for (let run = 1; run <= 3; run++) {
      const start = Date.now()
      
      await Promise.all(
        queries.map(sql => turso.execute({ sql, args: [] }))
      )
      
      const duration = Date.now() - start
      times.push(duration)
      console.log(`Run ${run}: ${duration}ms (${(duration/1000).toFixed(2)}s)`)
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    console.log(`\nAverage: ${Math.round(avg)}ms (${(avg/1000).toFixed(2)}s)`)
    
    console.log('\n─'.repeat(60))
    console.log('الآن قياس Q3 لوحدها (بدون Promise.all):\n')
    
    const q3Times = []
    for (let run = 1; run <= 3; run++) {
      const start = Date.now()
      await turso.execute({ sql: queries[2], args: [] })
      const duration = Date.now() - start
      q3Times.push(duration)
      console.log(`Q3 Run ${run}: ${duration}ms (${(duration/1000).toFixed(2)}s)`)
    }
    
    const q3Avg = q3Times.reduce((a, b) => a + b, 0) / q3Times.length
    console.log(`\nQ3 Average: ${Math.round(q3Avg)}ms (${(q3Avg/1000).toFixed(2)}s)`)
    
    console.log('\n─'.repeat(60))
    console.log('✅ المقارنة:')
    console.log(`  Promise.all (5 queries): ${(avg/1000).toFixed(2)}s`)
    console.log(`  Q3 alone: ${(q3Avg/1000).toFixed(2)}s`)
    console.log(`  Ratio: ${(q3Avg/avg).toFixed(2)}x slower`)
    console.log('─'.repeat(60) + '\n')
    
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
})()
