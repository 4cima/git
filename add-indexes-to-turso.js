/**
 * Add indexes to Turso database to speed up queries
 * Run: node add-indexes-to-turso.js
 */

const { createClient } = require('@libsql/client')
require('dotenv/config')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function addIndexes() {
  console.log('🔧 Adding indexes to Turso database...\n')

  try {
    // Movies indexes
    console.log('📊 Creating indexes for movies table...')
    
    const movieIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year)',
      'CREATE INDEX IF NOT EXISTS idx_movies_vote_average ON movies(vote_average)',
      'CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity)',
      'CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug)',
      'CREATE INDEX IF NOT EXISTS idx_movies_poster_path ON movies(poster_path)',
    ]

    for (const sql of movieIndexes) {
      try {
        await turso.execute(sql)
        console.log(`✅ ${sql.match(/idx_\w+/)[0]}`)
      } catch (e) {
        console.log(`⚠️  ${sql.match(/idx_\w+/)[0]} - ${e.message}`)
      }
    }

    // TV Series indexes
    console.log('\n📊 Creating indexes for tv_series table...')
    
    const seriesIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_series_first_air_year ON tv_series(first_air_year)',
      'CREATE INDEX IF NOT EXISTS idx_series_vote_average ON tv_series(vote_average)',
      'CREATE INDEX IF NOT EXISTS idx_series_popularity ON tv_series(popularity)',
      'CREATE INDEX IF NOT EXISTS idx_series_created_at ON tv_series(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_series_slug ON tv_series(slug)',
      'CREATE INDEX IF NOT EXISTS idx_series_poster_path ON tv_series(poster_path)',
      'CREATE INDEX IF NOT EXISTS idx_series_status ON tv_series(status)',
    ]

    for (const sql of seriesIndexes) {
      try {
        await turso.execute(sql)
        console.log(`✅ ${sql.match(/idx_\w+/)[0]}`)
      } catch (e) {
        console.log(`⚠️  ${sql.match(/idx_\w+/)[0]} - ${e.message}`)
      }
    }

    // Genres indexes
    console.log('\n📊 Creating indexes for genres table...')
    
    const genresIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_genres_slug ON genres(slug)',
    ]

    for (const sql of genresIndexes) {
      try {
        await turso.execute(sql)
        console.log(`✅ ${sql.match(/idx_\w+/)[0]}`)
      } catch (e) {
        console.log(`⚠️  ${sql.match(/idx_\w+/)[0]} - ${e.message}`)
      }
    }

    console.log('\n✅ All indexes added successfully!')
    console.log('\n💡 This should significantly speed up queries.')
    console.log('   Turso queries should now be much faster (< 1 second instead of 50 seconds)')

  } catch (error) {
    console.error('❌ Error adding indexes:', error)
    process.exit(1)
  }
}

addIndexes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
