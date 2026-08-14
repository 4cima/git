import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function rebuildShortTitles() {
  console.log('Rebuilding short_titles_lookup...\n')
  
  // Clear existing
  await turso.execute('DELETE FROM short_titles_lookup')
  console.log('Cleared existing entries')
  
  // Insert movies with short titles
  const moviesResult = await turso.execute(`
    INSERT INTO short_titles_lookup (
      source_id, media_type, title_ar, title_en, name_ar, name_en,
      poster_path, release_year, first_air_year, vote_average, 
      popularity, filter_status, slug, title_length
    )
    SELECT 
      id, 'movie', title_ar, title_en, NULL, NULL,
      poster_path, release_year, NULL, vote_average,
      popularity, filter_status, slug,
      CASE 
        WHEN LENGTH(title_ar) IN (1,2) THEN LENGTH(title_ar)
        ELSE LENGTH(title_en)
      END as title_length
    FROM movies
    WHERE LENGTH(title_ar) IN (1,2) OR LENGTH(title_en) IN (1,2)
  `)
  console.log(`Inserted ${moviesResult.rowsAffected} movies`)
  
  // Insert series with short names
  const seriesResult = await turso.execute(`
    INSERT INTO short_titles_lookup (
      source_id, media_type, title_ar, title_en, name_ar, name_en,
      poster_path, release_year, first_air_year, vote_average,
      popularity, filter_status, slug, title_length
    )
    SELECT 
      id, 'tv', NULL, NULL, name_ar, name_en,
      poster_path, NULL, first_air_year, vote_average,
      popularity, filter_status, slug,
      CASE 
        WHEN LENGTH(name_ar) IN (1,2) THEN LENGTH(name_ar)
        ELSE LENGTH(name_en)
      END as title_length
    FROM tv_series
    WHERE LENGTH(name_ar) IN (1,2) OR LENGTH(name_en) IN (1,2)
  `)
  console.log(`Inserted ${seriesResult.rowsAffected} series`)
  
  // Verify count
  const countResult = await turso.execute('SELECT COUNT(*) as cnt FROM short_titles_lookup')
  const totalCount = countResult.rows[0].cnt
  console.log(`\n✅ Total entries in short_titles_lookup: ${totalCount}`)
  console.log(`Expected: 605 (88 + 414 + 15 + 88)`)
  console.log(`Match: ${totalCount === 605 ? '✅ YES' : '❌ NO'}`)
}

rebuildShortTitles()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('❌ Error:', e.message)
    process.exit(1)
  })
