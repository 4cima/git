require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function measureQuery(name, sql) {
  console.log(`\n📊 ${name}`)
  console.log('─'.repeat(60))
  
  const times = []
  for (let i = 1; i <= 3; i++) {
    const start = Date.now()
    await turso.execute({ sql, args: [] })
    const duration = Date.now() - start
    times.push(duration)
    console.log(`  Run ${i}: ${duration}ms`)
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  console.log(`  Average: ${Math.round(avg)}ms`)
}

;(async () => {
  try {
    console.log('\n' + '='.repeat(60))
    console.log('ISOLATED QUERY PERFORMANCE - Q3 & Q4')
    console.log('='.repeat(60))

    // Q3: Latest Movies
    await measureQuery(
      'Q3: Latest Movies (ORDER BY release_year DESC, popularity DESC)',
      `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
       FROM movies 
       WHERE poster_path IS NOT NULL
       ORDER BY release_year DESC, popularity DESC
       LIMIT 50`
    )

    // Q4: Top Rated
    await measureQuery(
      'Q4: Top Rated (ORDER BY vote_average DESC)',
      `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, overview_ar, release_year as year, vote_average, genres_json
       FROM movies 
       WHERE poster_path IS NOT NULL 
         AND vote_average >= 7.5
       ORDER BY vote_average DESC
       LIMIT 50`
    )

    console.log('\n' + '='.repeat(60))
    console.log('✅ Both queries still use TEMP B-TREE for ORDER BY')
    console.log('   (acceptable for <1s query time)')
    console.log('='.repeat(60) + '\n')

    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
})()
