// Check production cache headers (requires production URL)
const productionUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://4cima.com'

console.log('Checking cache headers for production...\n')

const endpoints = [
  '/',
  '/movies',
  '/series',
  '/api/movies',
  '/api/series',
  '/api/movies?page=1&limit=20'
]

for (const endpoint of endpoints) {
  try {
    const response = await fetch(`${productionUrl}${endpoint}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    console.log(`\n${endpoint}:`)
    console.log(`  Status: ${response.status}`)
    console.log(`  CF-Cache-Status: ${response.headers.get('cf-cache-status') || 'NOT PRESENT'}`)
    console.log(`  Cache-Control: ${response.headers.get('cache-control') || 'NOT PRESENT'}`)
    console.log(`  CDN-Cache-Control: ${response.headers.get('cdn-cache-control') || 'NOT PRESENT'}`)
    console.log(`  X-Vercel-Cache: ${response.headers.get('x-vercel-cache') || 'NOT PRESENT'}`)
    console.log(`  X-Koyeb-Backend: ${response.headers.get('x-koyeb-backend') || 'NOT PRESENT'}`)
    console.log(`  Server: ${response.headers.get('server') || 'NOT PRESENT'}`)
    
    // Log all headers for first request to debug
    if (endpoint === '/') {
      console.log('\n  All headers for debugging:')
      response.headers.forEach((value, key) => {
        console.log(`    ${key}: ${value}`)
      })
    }
  } catch (error) {
    console.log(`\n${endpoint}: ERROR - ${error.message}`)
    console.log(`  Full error:`, error)
  }
}

console.log('\n' + '='.repeat(60))
console.log('NOTE: CF-Cache-Status values:')
console.log('  HIT      = Served from Cloudflare cache')
console.log('  MISS     = Not in cache, fetched from origin')
console.log('  DYNAMIC  = Cache disabled for this URL')
console.log('  EXPIRED  = Cache expired, revalidating')
console.log('  BYPASS   = Cache intentionally bypassed')
