/**
 * Final Verification: Count updated columns in Turso
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function verify() {
  try {
    console.log('🔍 Verifying final counts in Turso...\n')
    
    // Movies
    console.log('📊 MOVIES:')
    const moviesTotal = await turso.execute('SELECT COUNT(*) as count FROM movies')
    const moviesAge = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE age_rating IS NOT NULL')
    const moviesImdb = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE imdb_id IS NOT NULL')
    const moviesCountry = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE country_of_origin IS NOT NULL')
    
    const mTotal = moviesTotal.rows[0].count || moviesTotal.rows[0][0]
    const mAge = moviesAge.rows[0].count || moviesAge.rows[0][0]
    const mImdb = moviesImdb.rows[0].count || moviesImdb.rows[0][0]
    const mCountry = moviesCountry.rows[0].count || moviesCountry.rows[0][0]
    
    console.log(`  Total movies in Turso: ${mTotal.toLocaleString('en-US')}`)
    console.log(`  age_rating: ${mAge.toLocaleString('en-US')} (${((mAge/mTotal)*100).toFixed(2)}%)`)
    console.log(`  imdb_id: ${mImdb.toLocaleString('en-US')} (${((mImdb/mTotal)*100).toFixed(2)}%)`)
    console.log(`  country_of_origin: ${mCountry.toLocaleString('en-US')} (${((mCountry/mTotal)*100).toFixed(2)}%)`)
    
    // Series
    console.log('\n📊 TV SERIES:')
    const seriesTotal = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
    const seriesAge = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE age_rating IS NOT NULL')
    const seriesImdb = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE imdb_id IS NOT NULL')
    const seriesCountry = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE country_of_origin IS NOT NULL')
    
    const sTotal = seriesTotal.rows[0].count || seriesTotal.rows[0][0]
    const sAge = seriesAge.rows[0].count || seriesAge.rows[0][0]
    const sImdb = seriesImdb.rows[0].count || seriesImdb.rows[0][0]
    const sCountry = seriesCountry.rows[0].count || seriesCountry.rows[0][0]
    
    console.log(`  Total series in Turso: ${sTotal.toLocaleString('en-US')}`)
    console.log(`  age_rating: ${sAge.toLocaleString('en-US')} (${((sAge/sTotal)*100).toFixed(2)}%)`)
    console.log(`  imdb_id: ${sImdb.toLocaleString('en-US')} (${((sImdb/sTotal)*100).toFixed(2)}%)`)
    console.log(`  country_of_origin: ${sCountry.toLocaleString('en-US')} (${((sCountry/sTotal)*100).toFixed(2)}%)`)
    
    console.log('\n✅ Verification complete!')
    process.exit(0)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

verify()
