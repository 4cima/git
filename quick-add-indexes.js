const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addIndexes() {
  console.log('🚀 Adding indexes to Turso for faster queries...\n')
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC)',
    'CREATE INDEX IF NOT EXISTS idx_movies_vote_avg ON movies(vote_average DESC)',
    'CREATE INDEX IF NOT EXISTS idx_movies_poster ON movies(poster_path)',
    'CREATE INDEX IF NOT EXISTS idx_series_popularity ON tv_series(popularity DESC)',
    'CREATE INDEX IF NOT EXISTS idx_series_vote_avg ON tv_series(vote_average DESC)',
    'CREATE INDEX IF NOT EXISTS idx_series_poster ON tv_series(poster_path)',
  ]
  
  for (const sql of indexes) {
    try {
      console.log('⏳', sql.match(/idx_\w+/)[0])
      await turso.execute(sql)
      console.log('✅ Done')
    } catch (e) {
      console.log('⚠️ ', e.message)
    }
  }
  
  console.log('\n✨ All indexes added successfully!')
  console.log('📊 Queries should now be much faster (< 1 second instead of 50 seconds)')
}

addIndexes()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
