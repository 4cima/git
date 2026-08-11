// Test: Does Next.js Link component automatically encode special characters?

console.log('Testing Next.js Link href behavior with & character:\n')

// Simulating what happens with direct string interpolation
const slug = 'action-&-adventure'
const href1 = `/series?genre=${slug}`
console.log('1. Direct interpolation (current code):')
console.log(`   href="/series?genre=${slug}"`)
console.log(`   Result: ${href1}`)
console.log(`   ❌ PROBLEM: & is NOT encoded, will break URL parsing\n`)

// What should happen with encoding
const href2 = `/series?genre=${encodeURIComponent(slug)}`
console.log('2. With encodeURIComponent:')
console.log(`   href="/series?genre=${encodeURIComponent(slug)}"`)
console.log(`   Result: ${href2}`)
console.log(`   ✅ CORRECT: & becomes %26\n`)

// Next.js Link with object notation (automatic encoding)
const hrefObj = {
  pathname: '/series',
  query: { genre: slug }
}
console.log('3. Next.js Link with object notation (automatic encoding):')
console.log(`   href={{ pathname: '/series', query: { genre: '${slug}' } }}`)
console.log(`   Next.js will automatically encode to: /series?genre=${encodeURIComponent(slug)}`)
console.log(`   ✅ CORRECT: Next.js handles encoding\n`)

console.log('='.repeat(80))
console.log('CONCLUSION:')
console.log('  Current code uses string interpolation: href=\`/movies?genre=\${genre.slug}\`')
console.log('  This does NOT encode special characters')
console.log('  The & character WILL break URL parsing')
console.log('\n  FIX OPTIONS:')
console.log('  A) Change to: href={{ pathname: "/movies", query: { genre: genre.slug } }}')
console.log('  B) Change to: href=\`/movies?genre=\${encodeURIComponent(genre.slug)}\`')
console.log('  C) Remove & from slugs (Option B from earlier - fix database)')
console.log('\n  Option A is cleanest (Next.js handles encoding automatically)')
