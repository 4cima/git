const { createClient } = require('@libsql/client')
require('dotenv/config')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function addIndexes() {
  console.log('🚀 Adding indexes to Turso...\n')

  const indexes = [
    // Movies indexes
    'CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC)',
    'CREATE INDEX IF NOT EXISTS idx_movies_vote_average ON movies(vote_average DESC)',
    'CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year DESC)',
    'CREATE INDEX IF NOT EXISTS idx_movies_poster ON movies(poster_path)',
    
    // Series indexes
    'CREATE INDEX IF NOT EXISTS idx_series_popularity ON tv_series(popularity DESC)',
    'CREATE INDEX IF NOT EXISTS idx_series_vote_average ON tv_series(vote_average DESC)',
    'CREATE INDEX IF NOT EXISTS idx_series_first_air_year ON tv_series(first_air_year DESC)',
    'CREATE INDEX IF NOT EXISTS idx_series_poster ON tv_series(poster_path)',
    
    // Genres
    'CREATE INDEX IF NOT EXISTS idx_genres_slug ON genres(slug)',
  ]

  for (const sql of indexes) {
    try {
      await turso.execute(sql)
      const name = sql.match(/idx_\w+/)[0]
      console.log(`✅ ${name}`)
    } catch (e) {
      console.log(`⚠️  ${e.message}`)
    }
  }

  console.log('\n✨ Done! Indexes added successfully.')
  console.log('📊 Now queries should be much faster!')
}

addIndexes()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
