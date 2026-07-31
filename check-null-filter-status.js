/**
 * Check how many rows have NULL filter_status
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function checkNulls() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  فحص filter_status NULL')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Movies
  const moviesTotal = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const moviesNull = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE filter_status IS NULL')
  const moviesClean = await turso.execute("SELECT COUNT(*) as count FROM movies WHERE filter_status IN ('clean', 'reviewed_approved')")
  
  console.log('📽️  Movies:')
  console.log(`   الإجمالي: ${moviesTotal.rows[0].count}`)
  console.log(`   NULL: ${moviesNull.rows[0].count} (${(moviesNull.rows[0].count / moviesTotal.rows[0].count * 100).toFixed(1)}%)`)
  console.log(`   Clean/Approved: ${moviesClean.rows[0].count} (${(moviesClean.rows[0].count / moviesTotal.rows[0].count * 100).toFixed(1)}%)`)

  // Series
  const seriesTotal = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  const seriesNull = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE filter_status IS NULL')
  const seriesClean = await turso.execute("SELECT COUNT(*) as count FROM tv_series WHERE filter_status IN ('clean', 'reviewed_approved')")
  
  console.log('\n📺 TV Series:')
  console.log(`   الإجمالي: ${seriesTotal.rows[0].count}`)
  console.log(`   NULL: ${seriesNull.rows[0].count} (${(seriesNull.rows[0].count / seriesTotal.rows[0].count * 100).toFixed(1)}%)`)
  console.log(`   Clean/Approved: ${seriesClean.rows[0].count} (${(seriesClean.rows[0].count / seriesTotal.rows[0].count * 100).toFixed(1)}%)`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  turso.close()
}

checkNulls().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
