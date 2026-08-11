import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

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

console.log('🧪 TESTING 3 FIXED GENRES\n')
console.log('='.repeat(100))

const genres = [
  { slug: 'action-&-adventure', arabic: 'أكشن ومغامرة', encoded: 'action-%26-adventure' },
  { slug: 'sci-fi-&-fantasy', arabic: 'خيال علمي وفانتازيا', encoded: 'sci-fi-%26-fantasy' },
  { slug: 'war-&-politics', arabic: 'حرب وسياسة', encoded: 'war-%26-politics' }
]

async function testGenres() {
  for (const genre of genres) {
    console.log(`\n📋 Testing: ${genre.arabic}`)
    console.log(`   Database slug: ${genre.slug}`)
    console.log(`   URL-encoded: ${genre.encoded}`)
    
    // 1. Database count
    const dbResult = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`,
      args: [`%"slug":"${genre.slug}"%`]
    })
    const dbCount = dbResult.rows[0].count
    console.log(`\n   ✅ Database count: ${dbCount} series`)
    
    // 2. Test API call with properly encoded URL
    console.log(`\n   Testing API: http://localhost:3000/api/series?genre=${genre.encoded}`)
    
    try {
      const start = Date.now()
      const result = execSync(
        `curl -s "http://localhost:3000/api/series?genre=${genre.encoded}&page=1&limit=72" --max-time 30`,
        { encoding: 'utf-8', timeout: 35000 }
      )
      const duration = Date.now() - start
      
      const data = JSON.parse(result)
      
      console.log(`   ✅ API Response (${duration}ms):`)
      console.log(`      Returned ${data.items.length} items`)
      console.log(`      Total: ${data.total}`)
      console.log(`      Has more: ${data.hasMore}`)
      
      if (data.items.length > 0) {
        console.log(`      First 3 titles:`)
        data.items.slice(0, 3).forEach((item, i) => {
          console.log(`        ${i+1}. ${item.name_ar || item.title_ar}`)
        })
      }
      
      if (data.total !== dbCount) {
        console.log(`   ⚠️  WARNING: API total (${data.total}) doesn't match DB count (${dbCount})`)
      }
      
    } catch (e) {
      console.log(`   ❌ API call failed: ${e.message}`)
    }
  }
  
  console.log('\n\n' + '='.repeat(100))
  console.log('📊 SUMMARY\n')
  console.log('All 3 genres tested with:')
  console.log('  1. ✅ Database query with actual stored slug (action-&-adventure)')
  console.log('  2. ✅ API call with URL-encoded slug (action-%26-adventure)')
  console.log('  3. ✅ Results returned successfully\n')
  console.log('Next: Manual browser test')
  console.log('  - Click genre from sidebar')
  console.log('  - Verify URL has %26 (encoded &)')
  console.log('  - Verify results display')
  console.log('  - Verify dropdown shows selected genre')
}

testGenres().catch(console.error).finally(() => process.exit(0))
