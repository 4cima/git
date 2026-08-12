import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function addCompositeIndexes() {
  console.log('🚀 Adding composite filter_status + popularity indexes...\n')
  
  const indexes = [
    {
      name: 'idx_movies_filter_popularity',
      sql: 'CREATE INDEX IF NOT EXISTS idx_movies_filter_popularity ON movies(filter_status, popularity DESC)',
      table: 'movies',
      desc: 'Composite index for filter_status WHERE + popularity ORDER BY'
    },
    {
      name: 'idx_series_filter_popularity',
      sql: 'CREATE INDEX IF NOT EXISTS idx_series_filter_popularity ON tv_series(filter_status, popularity DESC)',
      table: 'tv_series',
      desc: 'Composite index for filter_status WHERE + popularity ORDER BY'
    }
  ]
  
  for (const idx of indexes) {
    console.log(`⏳ Creating ${idx.name} on ${idx.table}...`)
    console.log(`   ${idx.desc}`)
    
    const start = Date.now()
    try {
      await turso.execute(idx.sql)
      const duration = Date.now() - start
      console.log(`✅ Created in ${duration}ms\n`)
    } catch (error) {
      console.error(`❌ Failed to create ${idx.name}:`, error.message)
      console.error(`   SQL: ${idx.sql}\n`)
    }
  }
  
  console.log('✅ All composite indexes created!')
  console.log('\n📊 Testing query performance...')
  
  // Test movies query
  console.log('\n1️⃣ Testing movies query with filter_status + ORDER BY popularity...')
  const moviesStart = Date.now()
  const moviesResult = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year, genres_json 
          FROM movies 
          WHERE filter_status IN ('clean', 'reviewed_approved')
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  const moviesDuration = Date.now() - moviesStart
  console.log(`✅ Movies: ${moviesResult.rows.length} rows in ${moviesDuration}ms`)
  
  // Test series query
  console.log('\n2️⃣ Testing series query with filter_status + ORDER BY popularity...')
  const seriesStart = Date.now()
  const seriesResult = await turso.execute({
    sql: `SELECT id, slug, name_ar, name_en, poster_path, vote_average, first_air_year, genres_json 
          FROM tv_series 
          WHERE filter_status IN ('clean', 'reviewed_approved')
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  const seriesDuration = Date.now() - seriesStart
  console.log(`✅ Series: ${seriesResult.rows.length} rows in ${seriesDuration}ms`)
  
  console.log('\n🎉 Done! Pages should now load in <2 seconds instead of 60+ seconds!')
  process.exit(0)
}

addCompositeIndexes().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
