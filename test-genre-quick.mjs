import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

// Load .env.local
dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function testGenreQueries() {
  console.log('\n🎭 Testing Genre Query Performance (Direct DB)...\n')
  
  try {
    // Get genre info first
    const genreResult = await turso.execute({
      sql: 'SELECT * FROM genres WHERE slug = ? LIMIT 1',
      args: ['drama']
    })
    
    const genre = genreResult.rows[0]
    console.log(`Genre: ${genre.name_ar} (tmdb_id: ${genre.tmdb_id})`)
    
    // Test movie query with LIKE (current approach)
    console.log('\n📽️  Testing Movies with LIKE on name_ar...')
    const movieStart = Date.now()
    const movieResult = await turso.execute({
      sql: `
        SELECT m.*, 'movie' as media_type
        FROM movies m
        WHERE genres_json LIKE ?
        ORDER BY m.popularity DESC
        LIMIT 21 OFFSET 0
      `,
      args: [`%"name_ar":"${genre.name_ar}"%`]
    })
    const movieTime = Date.now() - movieStart
    const movieRows = movieResult.rows || []
    const movieHasMore = movieRows.length > 20
    if (movieHasMore) movieRows.pop()
    
    console.log(`✅ ${movieTime}ms - Found ${movieRows.length} movies, hasMore: ${movieHasMore}`)
    
    // Test series query with LIKE (current approach)
    console.log('\n📺 Testing Series with LIKE on name_ar...')
    const tvStart = Date.now()
    const tvResult = await turso.execute({
      sql: `
        SELECT s.*, 'tv' as media_type
        FROM tv_series s
        WHERE genres_json LIKE ?
        ORDER BY s.popularity DESC
        LIMIT 21 OFFSET 0
      `,
      args: [`%"name_ar":"${genre.name_ar}"%`]
    })
    const tvTime = Date.now() - tvStart
    const tvRows = tvResult.rows || []
    const tvHasMore = tvRows.length > 20
    if (tvHasMore) tvRows.pop()
    
    console.log(`✅ ${tvTime}ms - Found ${tvRows.length} series, hasMore: ${tvHasMore}`)
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 PERFORMANCE SUMMARY:')
    console.log('='.repeat(60))
    console.log(`Movies: ${movieTime}ms ${movieTime < 500 ? '🟢 FAST' : movieTime < 2000 ? '🟡 MEDIUM' : '🔴 SLOW'}`)
    console.log(`Series: ${tvTime}ms ${tvTime < 500 ? '🟢 FAST' : tvTime < 2000 ? '🟡 MEDIUM' : '🔴 SLOW'}`)
    console.log('\n✅ Both queries use limit+1 trick (no COUNT)')
    console.log('✅ Both queries use LIKE on name_ar (faster than json_each)')
    console.log('⚠️  LIKE is still slower than indexed lookup would be')
    console.log('💡 See TECH_DEBT.md #1 for genre_ids_csv solution\n')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testGenreQueries()
