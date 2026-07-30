require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function checkSchema() {
  console.log('📊 Checking tv_series table schema...\n')
  
  // Get table structure
  const schema = await turso.execute('PRAGMA table_info(tv_series)')
  
  console.log('✅ Available columns in tv_series:')
  console.log('─'.repeat(80))
  schema.rows.forEach(col => {
    console.log(`  ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''}`)
  })
  
  console.log('\n📈 Checking data distribution for filter fields...\n')
  
  // Check status distribution
  const statusQuery = await turso.execute(`
    SELECT status, COUNT(*) as count 
    FROM tv_series 
    WHERE status IS NOT NULL 
    GROUP BY status 
    ORDER BY count DESC 
    LIMIT 10
  `)
  console.log('🎬 Status Distribution:')
  statusQuery.rows.forEach(row => {
    console.log(`  ${row.status?.padEnd(30)} ${row.count}`)
  })
  
  // Check original_language distribution
  const langQuery = await turso.execute(`
    SELECT country_of_origin, COUNT(*) as count 
    FROM tv_series 
    WHERE country_of_origin IS NOT NULL 
    GROUP BY country_of_origin 
    ORDER BY count DESC 
    LIMIT 10
  `)
  console.log('\n🗣️  Country Distribution:')
  langQuery.rows.forEach(row => {
    console.log(`  ${row.country_of_origin?.padEnd(30)} ${row.count}`)
  })
  
  // Check number_of_seasons distribution
  const seasonsQuery = await turso.execute(`
    SELECT 
      CASE 
        WHEN number_of_seasons = 1 THEN '1 season'
        WHEN number_of_seasons BETWEEN 2 AND 3 THEN '2-3 seasons'
        WHEN number_of_seasons BETWEEN 4 AND 6 THEN '4-6 seasons'
        WHEN number_of_seasons > 6 THEN '7+ seasons'
      END as season_range,
      COUNT(*) as count
    FROM tv_series 
    WHERE number_of_seasons IS NOT NULL
    GROUP BY season_range
    ORDER BY count DESC
  `)
  console.log('\n📺 Seasons Distribution:')
  seasonsQuery.rows.forEach(row => {
    console.log(`  ${row.season_range?.padEnd(30)} ${row.count}`)
  })
  
  // Check vote_average distribution
  const ratingQuery = await turso.execute(`
    SELECT 
      CASE 
        WHEN vote_average >= 9 THEN '9+'
        WHEN vote_average >= 8 THEN '8-9'
        WHEN vote_average >= 7 THEN '7-8'
        WHEN vote_average >= 6 THEN '6-7'
        ELSE 'Below 6'
      END as rating_range,
      COUNT(*) as count
    FROM tv_series 
    WHERE vote_average > 0
    GROUP BY rating_range
    ORDER BY 
      CASE rating_range
        WHEN '9+' THEN 1
        WHEN '8-9' THEN 2
        WHEN '7-8' THEN 3
        WHEN '6-7' THEN 4
        ELSE 5
      END
  `)
  console.log('\n⭐ Rating Distribution:')
  ratingQuery.rows.forEach(row => {
    console.log(`  ${row.rating_range?.padEnd(30)} ${row.count}`)
  })
  
  // Check age_rating distribution
  const ageQuery = await turso.execute(`
    SELECT age_rating, COUNT(*) as count 
    FROM tv_series 
    WHERE age_rating IS NOT NULL 
    GROUP BY age_rating 
    ORDER BY count DESC 
    LIMIT 10
  `)
  console.log('\n🔞 Age Rating Distribution:')
  ageQuery.rows.forEach(row => {
    console.log(`  ${row.age_rating?.padEnd(30)} ${row.count}`)
  })
  
  console.log('\n✅ Schema check complete!')
}

checkSchema().catch(console.error)
