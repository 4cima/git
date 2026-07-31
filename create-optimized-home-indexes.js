/**
 * Create optimized indexes specifically for /api/home queries
 * These indexes match EXACTLY the WHERE clauses without extra conditions
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function createIndexes() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  إنشاء Indexes محسنة لـ /api/home')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const indexes = [
    {
      name: 'idx_movies_home_trending',
      comment: 'Query 1: trendingMovies - ALREADY EXISTS as idx_movies_pop_partial2',
      sql: null, // Already perfect!
      status: '✅ Already exists and working (0.55s)'
    },
    {
      name: 'idx_series_home_trending',
      comment: 'Query 2: trendingSeries',
      sql: `CREATE INDEX IF NOT EXISTS idx_series_home_trending 
            ON tv_series(popularity DESC) 
            WHERE poster_path IS NOT NULL 
              AND backdrop_path IS NOT NULL 
              AND vote_average > 0`,
      matches: 'Exact match for Query 2 WHERE clause'
    },
    {
      name: 'idx_movies_home_latest',
      comment: 'Query 3: latest (الأبطأ - 187.6s)',
      sql: `CREATE INDEX IF NOT EXISTS idx_movies_home_latest 
            ON movies(release_year DESC, popularity DESC) 
            WHERE poster_path IS NOT NULL`,
      matches: 'Exact match for Query 3 WHERE clause'
    },
    {
      name: 'idx_movies_home_toprated',
      comment: 'Query 4: topRated',
      sql: `CREATE INDEX IF NOT EXISTS idx_movies_home_toprated 
            ON movies(vote_average DESC) 
            WHERE poster_path IS NOT NULL 
              AND vote_average >= 7.5`,
      matches: 'Exact match for Query 4 WHERE clause'
    },
    {
      name: 'idx_series_home_all',
      comment: 'Query 5: series',
      sql: `CREATE INDEX IF NOT EXISTS idx_series_home_all 
            ON tv_series(popularity DESC) 
            WHERE poster_path IS NOT NULL`,
      matches: 'Exact match for Query 5 WHERE clause'
    }
  ]

  for (const idx of indexes) {
    console.log(`📌 ${idx.name}`)
    console.log(`   ${idx.comment}`)
    
    if (idx.sql) {
      console.log(`   Match: ${idx.matches}`)
      console.log(`   SQL: ${idx.sql.replace(/\s+/g, ' ').trim()}`)
      
      try {
        const start = Date.now()
        await turso.execute(idx.sql)
        const duration = Date.now() - start
        console.log(`   ✅ Created in ${duration}ms`)
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`   ℹ️  Already exists`)
        } else {
          console.log(`   ❌ Error: ${err.message}`)
        }
      }
    } else {
      console.log(`   ${idx.status}`)
    }
    
    console.log()
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Indexes created!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  turso.close()
}

createIndexes().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
