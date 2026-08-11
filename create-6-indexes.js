import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const turso = createClient({
  url: envVars.TURSO_DATABASE_URL,
  authToken: envVars.TURSO_AUTH_TOKEN,
})

const indexes = [
  {
    name: 'idx_movies_vote_average_desc',
    table: 'movies',
    sql: 'CREATE INDEX idx_movies_vote_average_desc ON movies(vote_average DESC, popularity DESC)',
    fixes: 'Movies vote_average sort (39s → <2s)'
  },
  {
    name: 'idx_movies_vote_count_desc',
    table: 'movies',
    sql: 'CREATE INDEX idx_movies_vote_count_desc ON movies(vote_count DESC, popularity DESC)',
    fixes: 'Movies vote_count sort (29s → <2s) + rating+vote_count combo (26s → <2s)'
  },
  {
    name: 'idx_movies_year_popularity',
    table: 'movies',
    sql: 'CREATE INDEX idx_movies_year_popularity ON movies(release_year, popularity DESC)',
    fixes: 'Movies 2000s decade (10s → <2s) + year filters'
  },
  {
    name: 'idx_series_year_popularity',
    table: 'tv_series',
    sql: 'CREATE INDEX idx_series_year_popularity ON tv_series(first_air_year, popularity DESC)',
    fixes: 'Series year filters (reduce SLOW queries)'
  },
  {
    name: 'idx_series_country_popularity',
    table: 'tv_series',
    sql: 'CREATE INDEX idx_series_country_popularity ON tv_series(country_of_origin, popularity DESC)',
    fixes: 'Series country filters (reduce SLOW queries)'
  },
  {
    name: 'idx_series_vote_average_popularity',
    table: 'tv_series',
    sql: 'CREATE INDEX idx_series_vote_average_popularity ON tv_series(vote_average, popularity DESC)',
    fixes: 'Series rating filters (10-11s → <2s)'
  }
]

console.log('🔧 CREATING 6 APPROVED INDEXES')
console.log('='.repeat(100))
console.log()

async function createIndexes() {
  let successCount = 0
  let failCount = 0
  
  for (const idx of indexes) {
    console.log(`\n[${successCount + failCount + 1}/6] Creating: ${idx.name}`)
    console.log(`   Table: ${idx.table}`)
    console.log(`   SQL: ${idx.sql}`)
    console.log(`   Fixes: ${idx.fixes}`)
    
    const startTime = Date.now()
    
    try {
      await turso.execute(idx.sql)
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`   ✅ SUCCESS (${duration}s)`)
      successCount++
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      if (error.message.includes('already exists')) {
        console.log(`   ⚠️  ALREADY EXISTS (${duration}s) - skipping`)
        successCount++
      } else {
        console.log(`   ❌ FAILED (${duration}s)`)
        console.log(`   Error: ${error.message}`)
        failCount++
      }
    }
  }
  
  console.log('\n\n' + '='.repeat(100))
  console.log('📊 INDEX CREATION SUMMARY')
  console.log('='.repeat(100))
  console.log(`\n   ✅ Successful: ${successCount}/6`)
  console.log(`   ❌ Failed: ${failCount}/6`)
  
  if (successCount === 6) {
    console.log('\n   🎉 ALL 6 INDEXES CREATED SUCCESSFULLY!')
    console.log('\n   Expected improvements:')
    console.log('      • Movies vote_average sort: 39s → <2s')
    console.log('      • Movies vote_count sort: 29s → <2s')
    console.log('      • Movies 2000s decade: 10s → <2s')
    console.log('      • Series rating filters: 10-11s → <2s')
    console.log('      • Year/country SLOW filters reduced')
  }
}

createIndexes().catch(console.error).finally(() => process.exit(0))
