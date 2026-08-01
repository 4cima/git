const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function addSortIndexes() {
  try {
    console.log('🔧 Adding indexes for sort filters...\n')

    // 1. Index for vote_average (standalone for better performance)
    console.log('📊 Creating index for vote_average...')
    const startVoteAvg = Date.now()
    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_vote_average 
      ON tv_series(vote_average DESC)
    `)
    console.log(`✅ idx_series_vote_average created in ${Date.now() - startVoteAvg}ms\n`)

    // 2. Index for vote_count (number of ratings)
    console.log('📊 Creating index for vote_count...')
    const startVoteCount = Date.now()
    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_vote_count 
      ON tv_series(vote_count DESC)
    `)
    console.log(`✅ idx_series_vote_count created in ${Date.now() - startVoteCount}ms\n`)

    // 3. Index for created_at (recently added)
    console.log('📊 Creating index for created_at...')
    const startCreatedAt = Date.now()
    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_created_at 
      ON tv_series(created_at DESC)
    `)
    console.log(`✅ idx_series_created_at created in ${Date.now() - startCreatedAt}ms\n`)

    // 4. Index for first_air_year ASC (for oldest first)
    console.log('📊 Creating index for first_air_year ASC...')
    const startYearAsc = Date.now()
    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_year_asc 
      ON tv_series(first_air_year ASC)
    `)
    console.log(`✅ idx_series_year_asc created in ${Date.now() - startYearAsc}ms\n`)

    // 5. Index for name_ar DESC (for Z-A sorting)
    console.log('📊 Creating index for name_ar DESC...')
    const startNameDesc = Date.now()
    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_name_ar_desc 
      ON tv_series(name_ar DESC)
    `)
    console.log(`✅ idx_series_name_ar_desc created in ${Date.now() - startNameDesc}ms\n`)

    console.log('✨ All indexes created successfully!\n')

    // Test query performance
    console.log('🧪 Testing query performance...\n')

    // Test vote_average
    const testVoteAvg = Date.now()
    await turso.execute(`
      SELECT id, name_ar, vote_average 
      FROM tv_series 
      ORDER BY vote_average DESC 
      LIMIT 10
    `)
    console.log(`⚡ vote_average sorting: ${Date.now() - testVoteAvg}ms`)

    // Test vote_count
    const testVoteCount = Date.now()
    await turso.execute(`
      SELECT id, name_ar, vote_count 
      FROM tv_series 
      ORDER BY vote_count DESC 
      LIMIT 10
    `)
    console.log(`⚡ vote_count sorting: ${Date.now() - testVoteCount}ms`)

    // Test created_at
    const testCreatedAt = Date.now()
    await turso.execute(`
      SELECT id, name_ar, created_at 
      FROM tv_series 
      ORDER BY created_at DESC 
      LIMIT 10
    `)
    console.log(`⚡ created_at sorting: ${Date.now() - testCreatedAt}ms`)

    // Test first_air_year ASC
    const testYearAsc = Date.now()
    await turso.execute(`
      SELECT id, name_ar, first_air_year 
      FROM tv_series 
      ORDER BY first_air_year ASC 
      LIMIT 10
    `)
    console.log(`⚡ first_air_year ASC sorting: ${Date.now() - testYearAsc}ms`)

    // Test name_ar DESC
    const testNameDesc = Date.now()
    await turso.execute(`
      SELECT id, name_ar 
      FROM tv_series 
      ORDER BY name_ar DESC 
      LIMIT 10
    `)
    console.log(`⚡ name_ar DESC sorting: ${Date.now() - testNameDesc}ms`)

    console.log('\n✅ All tests passed!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

addSortIndexes()
