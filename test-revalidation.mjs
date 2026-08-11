import dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const SECRET = process.env.REVALIDATE_SECRET

console.log('\n🧪 Testing On-Demand Revalidation...\n')
console.log(`Base URL: ${BASE_URL}`)
console.log(`Secret: ${SECRET ? '✅ Found' : '❌ Missing'}\n`)

if (!SECRET) {
  console.error('❌ REVALIDATE_SECRET not found in .env.local')
  process.exit(1)
}

async function testRevalidation() {
  try {
    // Test 1: GET request (health check)
    console.log('📋 Test 1: GET /api/revalidate (health check)')
    const getResponse = await fetch(`${BASE_URL}/api/revalidate`, {
      method: 'GET',
      headers: {
        'X-Revalidate-Secret': SECRET
      }
    })
    
    if (getResponse.ok) {
      const data = await getResponse.json()
      console.log('✅ GET succeeded:', data.message)
      console.log(`   Paths to revalidate: ${data.paths.join(', ')}\n`)
    } else {
      console.error('❌ GET failed:', getResponse.status, getResponse.statusText)
      const error = await getResponse.json()
      console.error('   Error:', error)
    }
    
    // Test 2: POST request (actual revalidation)
    console.log('📋 Test 2: POST /api/revalidate (trigger revalidation)')
    const postStart = Date.now()
    const postResponse = await fetch(`${BASE_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'X-Revalidate-Secret': SECRET
      }
    })
    const postTime = Date.now() - postStart
    
    if (postResponse.ok) {
      const data = await postResponse.json()
      console.log(`✅ POST succeeded (${postTime}ms)`)
      console.log(`   Message: ${data.message}`)
      console.log(`   Revalidated: ${data.revalidated.join(', ')}`)
      console.log(`   Timestamp: ${data.timestamp}\n`)
    } else {
      console.error(`❌ POST failed (${postTime}ms):`, postResponse.status, postResponse.statusText)
      const error = await postResponse.json()
      console.error('   Error:', error)
    }
    
    // Test 3: Invalid secret
    console.log('📋 Test 3: POST with invalid secret (should fail)')
    const invalidResponse = await fetch(`${BASE_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'X-Revalidate-Secret': 'invalid_secret'
      }
    })
    
    if (invalidResponse.status === 401) {
      console.log('✅ Correctly rejected invalid secret\n')
    } else {
      console.error('❌ Expected 401, got:', invalidResponse.status)
    }
    
    // Test 4: Check if cache headers changed on a page
    console.log('📋 Test 4: Checking /movies cache headers')
    const moviesResponse = await fetch(`${BASE_URL}/movies`, {
      cache: 'no-store'
    })
    
    console.log(`   Status: ${moviesResponse.status}`)
    console.log(`   X-Nextjs-Cache: ${moviesResponse.headers.get('x-nextjs-cache') || 'NOT PRESENT'}`)
    console.log(`   Cache-Control: ${moviesResponse.headers.get('cache-control') || 'NOT PRESENT'}`)
    console.log(`   X-Nextjs-Stale-Time: ${moviesResponse.headers.get('x-nextjs-stale-time') || 'NOT PRESENT'}`)
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ All tests complete!')
    console.log('='.repeat(60))
    console.log('\n💡 Next steps:')
    console.log('   1. Run a sync: node scripts/3-sync-to-turso.js')
    console.log('   2. Sync will auto-trigger revalidation at the end')
    console.log('   3. Site updates immediately (no 5-minute wait)\n')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error)
  }
}

testRevalidation()
