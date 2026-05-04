import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.dev.vars' })

async function analyzeMissingFields() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
  
  console.log('📊 Detailed Analysis of Missing Fields\n')
  console.log('='.repeat(100))
  
  const movieAnalysis = await db.execute(`
    SELECT 
      SUM(CASE WHEN title IS NULL OR title = '' THEN 1 ELSE 0 END) as missing_title,
      SUM(CASE WHEN title_ar IS NULL OR title_ar = '' THEN 1 ELSE 0 END) as missing_title_ar,
      SUM(CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 ELSE 0 END) as missing_overview_ar,
      SUM(CASE WHEN release_date IS NULL THEN 1 ELSE 0 END) as missing_date,
      SUM(CASE WHEN poster_path IS NULL THEN 1 ELSE 0 END) as missing_poster,
      SUM(CASE WHEN slug IS NULL OR slug = '' THEN 1 ELSE 0 END) as missing_slug,
      SUM(CASE WHEN primary_genre IS NULL OR primary_genre = '' THEN 1 ELSE 0 END) as missing_genre,
      COUNT(*) as total
    FROM movies 
    WHERE is_complete = 0
  `)
  
  const mStats = movieAnalysis.rows[0] as any
  
  console.log('\n🎬 MOVIES - Incomplete: ' + mStats.total)
  console.log('-'.repeat(100))
  console.log(`Missing Title (EN):        ${mStats.missing_title}`)
  console.log(`Missing Title (AR):        ${mStats.missing_title_ar}`)
  console.log(`Missing Overview (AR):     ${mStats.missing_overview_ar}`)
  console.log(`Missing Release Date:      ${mStats.missing_date}`)
  console.log(`Missing Poster:            ${mStats.missing_poster}`)
  console.log(`Missing Slug:              ${mStats.missing_slug}`)
  console.log(`Missing Genre:             ${mStats.missing_genre}`)
  
  const tvAnalysis = await db.execute(`
    SELECT 
      SUM(CASE WHEN name IS NULL OR name = '' THEN 1 ELSE 0 END) as missing_name,
      SUM(CASE WHEN name_ar IS NULL OR name_ar = '' THEN 1 ELSE 0 END) as missing_name_ar,
      SUM(CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 ELSE 0 END) as missing_overview_ar,
      SUM(CASE WHEN first_air_date IS NULL THEN 1 ELSE 0 END) as missing_date,
      SUM(CASE WHEN poster_path IS NULL THEN 1 ELSE 0 END) as missing_poster,
      SUM(CASE WHEN slug IS NULL OR slug = '' THEN 1 ELSE 0 END) as missing_slug,
      SUM(CASE WHEN primary_genre IS NULL OR primary_genre = '' THEN 1 ELSE 0 END) as missing_genre,
      COUNT(*) as total
    FROM tv_series 
    WHERE is_complete = 0
  `)
  
  const tStats = tvAnalysis.rows[0] as any
  
  console.log('\n\n📺 TV SERIES - Incomplete: ' + tStats.total)
  console.log('-'.repeat(100))
  console.log(`Missing Name (EN):         ${tStats.missing_name}`)
  console.log(`Missing Name (AR):         ${tStats.missing_name_ar}`)
  console.log(`Missing Overview (AR):     ${tStats.missing_overview_ar}`)
  console.log(`Missing First Air Date:    ${tStats.missing_date}`)
  console.log(`Missing Poster:            ${tStats.missing_poster}`)
  console.log(`Missing Slug:              ${tStats.missing_slug}`)
  console.log(`Missing Genre:             ${tStats.missing_genre}`)
  
  console.log('\n\n📈 SUMMARY - Most Common Missing Fields:')
  console.log('='.repeat(100))
  
  const movieMissing = [
    { field: 'Genre', count: mStats.missing_genre },
    { field: 'Overview (AR)', count: mStats.missing_overview_ar },
    { field: 'Title (AR)', count: mStats.missing_title_ar },
    { field: 'Date', count: mStats.missing_date },
    { field: 'Title (EN)', count: mStats.missing_title },
    { field: 'Slug', count: mStats.missing_slug },
    { field: 'Poster', count: mStats.missing_poster },
  ].sort((a, b) => b.count - a.count)
  
  console.log('\n🎬 Movies:')
  movieMissing.forEach((item, i) => {
    if (item.count > 0) {
      console.log(`  ${i + 1}. ${item.field}: ${item.count}`)
    }
  })
  
  const tvMissing = [
    { field: 'Genre', count: tStats.missing_genre },
    { field: 'Overview (AR)', count: tStats.missing_overview_ar },
    { field: 'Name (AR)', count: tStats.missing_name_ar },
    { field: 'Date', count: tStats.missing_date },
    { field: 'Name (EN)', count: tStats.missing_name },
    { field: 'Slug', count: tStats.missing_slug },
    { field: 'Poster', count: tStats.missing_poster },
  ].sort((a, b) => b.count - a.count)
  
  console.log('\n📺 TV Series:')
  tvMissing.forEach((item, i) => {
    if (item.count > 0) {
      console.log(`  ${i + 1}. ${item.field}: ${item.count}`)
    }
  })
  
  console.log('\n✅ Analysis complete!')
}

analyzeMissingFields()
