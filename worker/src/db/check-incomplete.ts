import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.dev.vars' })

async function checkIncomplete() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
  
  console.log('📊 Incomplete Content Analysis\n')
  
  // Get 10 incomplete movies
  const incompleteMovies = await db.execute(`
    SELECT 
      id, title, slug, 
      CASE WHEN overview IS NULL OR overview = '' THEN 'NO' ELSE 'YES' END as has_overview,
      CASE WHEN release_date IS NULL THEN 'NO' ELSE 'YES' END as has_date,
      CASE WHEN vote_average > 0 THEN 'YES' ELSE 'NO' END as has_rating,
      CASE WHEN poster_path IS NULL THEN 'NO' ELSE 'YES' END as has_poster
    FROM movies 
    WHERE is_complete = 0 
    LIMIT 10
  `)
  
  console.log('🎬 INCOMPLETE MOVIES (10 samples):')
  console.log('=' .repeat(100))
  incompleteMovies.rows.forEach((row: any, i) => {
    console.log(`\n${i + 1}. ${row.title || 'NO TITLE'} (${row.slug})`)
    console.log(`   Overview: ${row.has_overview} | Date: ${row.has_date} | Rating: ${row.has_rating} | Poster: ${row.has_poster}`)
  })
  
  // Get 10 incomplete TV series
  const incompleteSeries = await db.execute(`
    SELECT 
      id, name, slug,
      CASE WHEN overview IS NULL OR overview = '' THEN 'NO' ELSE 'YES' END as has_overview,
      CASE WHEN first_air_date IS NULL THEN 'NO' ELSE 'YES' END as has_date,
      CASE WHEN vote_average > 0 THEN 'YES' ELSE 'NO' END as has_rating,
      CASE WHEN poster_path IS NULL THEN 'NO' ELSE 'YES' END as has_poster
    FROM tv_series 
    WHERE is_complete = 0 
    LIMIT 10
  `)
  
  console.log('\n\n📺 INCOMPLETE TV SERIES (10 samples):')
  console.log('=' .repeat(100))
  incompleteSeries.rows.forEach((row: any, i) => {
    console.log(`\n${i + 1}. ${row.name || 'NO NAME'} (${row.slug})`)
    console.log(`   Overview: ${row.has_overview} | Date: ${row.has_date} | Rating: ${row.has_rating} | Poster: ${row.has_poster}`)
  })
  
  // Summary stats
  const movieStats = await db.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN overview IS NULL OR overview = '' THEN 1 ELSE 0 END) as no_overview,
      SUM(CASE WHEN release_date IS NULL THEN 1 ELSE 0 END) as no_date,
      SUM(CASE WHEN vote_average <= 0 THEN 1 ELSE 0 END) as no_rating,
      SUM(CASE WHEN poster_path IS NULL THEN 1 ELSE 0 END) as no_poster
    FROM movies 
    WHERE is_complete = 0
  `)
  
  const tvStats = await db.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN overview IS NULL OR overview = '' THEN 1 ELSE 0 END) as no_overview,
      SUM(CASE WHEN first_air_date IS NULL THEN 1 ELSE 0 END) as no_date,
      SUM(CASE WHEN vote_average <= 0 THEN 1 ELSE 0 END) as no_rating,
      SUM(CASE WHEN poster_path IS NULL THEN 1 ELSE 0 END) as no_poster
    FROM tv_series 
    WHERE is_complete = 0
  `)
  
  console.log('\n\n📈 SUMMARY OF MISSING DATA:')
  console.log('=' .repeat(100))
  
  const mStats = movieStats.rows[0] as any
  console.log('\n🎬 Movies (Total Incomplete: ' + mStats.total + '):')
  console.log(`   Missing Overview: ${mStats.no_overview}`)
  console.log(`   Missing Date: ${mStats.no_date}`)
  console.log(`   Missing Rating: ${mStats.no_rating}`)
  console.log(`   Missing Poster: ${mStats.no_poster}`)
  
  const tStats = tvStats.rows[0] as any
  console.log('\n📺 TV Series (Total Incomplete: ' + tStats.total + '):')
  console.log(`   Missing Overview: ${tStats.no_overview}`)
  console.log(`   Missing Date: ${tStats.no_date}`)
  console.log(`   Missing Rating: ${tStats.no_rating}`)
  console.log(`   Missing Poster: ${tStats.no_poster}`)
  
  console.log('\n✅ Analysis complete!')
}

checkIncomplete()
