require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function check() {
  console.log('Checking movies age_rating...')
  const r1 = await turso.execute('SELECT COUNT(*) FROM movies WHERE age_rating IS NOT NULL')
  console.log('Movies age_rating:', r1.rows[0][0])
  
  console.log('Checking movies imdb_id...')
  const r2 = await turso.execute('SELECT COUNT(*) FROM movies WHERE imdb_id IS NOT NULL')
  console.log('Movies imdb_id:', r2.rows[0][0])
  
  console.log('Checking movies country_of_origin...')
  const r3 = await turso.execute('SELECT COUNT(*) FROM movies WHERE country_of_origin IS NOT NULL')
  console.log('Movies country_of_origin:', r3.rows[0][0])
  
  console.log('Checking series age_rating...')
  const r4 = await turso.execute('SELECT COUNT(*) FROM tv_series WHERE age_rating IS NOT NULL')
  console.log('Series age_rating:', r4.rows[0][0])
  
  console.log('Checking series imdb_id...')
  const r5 = await turso.execute('SELECT COUNT(*) FROM tv_series WHERE imdb_id IS NOT NULL')
  console.log('Series imdb_id:', r5.rows[0][0])
  
  console.log('Checking series country_of_origin...')
  const r6 = await turso.execute('SELECT COUNT(*) FROM tv_series WHERE country_of_origin IS NOT NULL')
  console.log('Series country_of_origin:', r6.rows[0][0])
  
  process.exit(0)
}

check().catch(e => { console.error(e); process.exit(1) })
