/**
 * Reproduce the year-removal hang bug
 * Steps: country=KR → year=2023 → sort=oldest → remove year
 */

const BASE_URL = 'http://localhost:3000'

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function reproduceHang() {
  console.log('\n' + '='.repeat(80))
  console.log('YEAR-REMOVAL HANG BUG REPRODUCTION')
  console.log('='.repeat(80))
  console.log('\n📊 Watch server terminal for request timing and overlaps\n')
  
  // Step 1: Select country = Korea
  console.log('[Step 1] Select country = Korea')
  const start1 = Date.now()
  const req1 = await fetch(`${BASE_URL}/api/movies?page=1&limit=72&sort=popularity&order=desc&country=KR`)
  await req1.json()
  const time1 = Date.now() - start1
  console.log(`         ✓ Completed in ${time1}ms\n`)
  await wait(500)
  
  // Step 2: Add year = 2023
  console.log('[Step 2] Add year = 2023')
  const start2 = Date.now()
  const req2 = await fetch(`${BASE_URL}/api/movies?page=1&limit=72&sort=popularity&order=desc&country=KR&year=2023`)
  await req2.json()
  const time2 = Date.now() - start2
  console.log(`         ✓ Completed in ${time2}ms\n`)
  await wait(500)
  
  // Step 3: Change sort to "oldest" (release_year asc)
  console.log('[Step 3] Change sort to "الأقدم" (oldest / release_year asc)')
  const start3 = Date.now()
  const req3 = await fetch(`${BASE_URL}/api/movies?page=1&limit=72&sort=release_year&order=asc&country=KR&year=2023`)
  await req3.json()
  const time3 = Date.now() - start3
  console.log(`         ✓ Completed in ${time3}ms\n`)
  await wait(500)
  
  // Step 4: Remove year (back to "all years") — THIS IS WHERE IT HANGS
  console.log('[Step 4] Remove year (back to "all years") — HANG EXPECTED HERE')
  console.log('         This should request: country=KR, sort=release_year asc, no year')
  console.log('         Server showed this took 51.6s in previous logs\n')
  const start4 = Date.now()
  console.log('         ⏳ Request sent... waiting for response...')
  
  try {
    const req4 = await fetch(`${BASE_URL}/api/movies?page=1&limit=72&sort=release_year&order=asc&country=KR`)
    await req4.json()
    const time4 = Date.now() - start4
    console.log(`         ✓ Completed in ${time4}ms (${(time4/1000).toFixed(1)}s)`)
    
    if (time4 > 10000) {
      console.log(`\n⚠️  SLOW QUERY DETECTED: ${(time4/1000).toFixed(1)}s`)
    }
  } catch (err) {
    const time4 = Date.now() - start4
    console.log(`         ❌ Failed after ${time4}ms: ${err.message}`)
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('REPRODUCTION COMPLETE')
  console.log('='.repeat(80))
  console.log('\n📋 Check server terminal:')
  console.log('   1. How long did the Step 4 request take?')
  console.log('   2. Did any requests overlap/race?')
  console.log('   3. Was there a 51s+ query?')
}

reproduceHang().catch(console.error)
