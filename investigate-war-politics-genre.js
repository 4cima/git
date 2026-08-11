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

console.log('🔍 INVESTIGATING: war-politics genre\n')
console.log('='.repeat(100))

async function investigate() {
  // 1. Check TMDB ID 10768 directly
  console.log('\n1️⃣  Checking TMDB ID 10768 (War & Politics):\n')
  
  const tmdbCheck = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`,
    args: ['%"tmdb_id":10768%']
  })
  console.log(`   Series with TMDB ID 10768: ${tmdbCheck.rows[0].count}`)
  
  if (tmdbCheck.rows[0].count > 0) {
    // Get sample
    const sample = await turso.execute({
      sql: `SELECT genres_json FROM tv_series WHERE genres_json LIKE ? LIMIT 3`,
      args: ['%"tmdb_id":10768%']
    })
    console.log(`\n   Sample entries:`)
    sample.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.genres_json}`)
    })
  }
  
  // 2. Check Arabic name variants
  console.log('\n\n2️⃣  Checking Arabic name variants:\n')
  
  const arabicVariants = [
    { text: 'حرب', label: 'war (حرب)' },
    { text: 'سياسة', label: 'politics (سياسة)' },
    { text: 'حرب وسياسة', label: 'war-politics combined (حرب وسياسة)' },
  ]
  
  for (const variant of arabicVariants) {
    const result = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`,
      args: [`%${variant.text}%`]
    })
    console.log(`   ${variant.label}: ${result.rows[0].count} series`)
    
    if (result.rows[0].count > 0 && result.rows[0].count < 5) {
      const sample = await turso.execute({
        sql: `SELECT genres_json FROM tv_series WHERE genres_json LIKE ? LIMIT 2`,
        args: [`%${variant.text}%`]
      })
      sample.rows.forEach(row => {
        console.log(`      Sample: ${row.genres_json}`)
      })
    }
  }
  
  // 3. Check slug variants
  console.log('\n\n3️⃣  Checking slug variants:\n')
  
  const slugVariants = [
    'war-politics',
    'war-&-politics',
    'war_politics',
    'warpolitics',
    'war',
    'politics'
  ]
  
  for (const slug of slugVariants) {
    const result = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`,
      args: [`%"slug":"${slug}"%`]
    })
    if (result.rows[0].count > 0) {
      console.log(`   ✅ "${slug}": ${result.rows[0].count} series`)
      
      // Get sample
      if (result.rows[0].count < 5) {
        const sample = await turso.execute({
          sql: `SELECT genres_json FROM tv_series WHERE genres_json LIKE ? LIMIT 2`,
          args: [`%"slug":"${slug}"%`]
        })
        sample.rows.forEach(row => {
          console.log(`      Sample: ${row.genres_json}`)
        })
      }
    } else {
      console.log(`   ❌ "${slug}": 0 series`)
    }
  }
  
  // 4. Get broader sample to see all unique genre slugs
  console.log('\n\n4️⃣  All unique genre slugs in database:\n')
  
  const allGenres = await turso.execute({
    sql: `SELECT genres_json FROM tv_series WHERE genres_json IS NOT NULL AND genres_json != '[]' LIMIT 100`,
    args: []
  })
  
  const uniqueSlugs = new Set()
  allGenres.rows.forEach(row => {
    try {
      const genres = JSON.parse(row.genres_json)
      genres.forEach(g => {
        if (g.slug) uniqueSlugs.add(g.slug)
      })
    } catch (e) {
      // skip
    }
  })
  
  const sortedSlugs = Array.from(uniqueSlugs).sort()
  console.log(`   Found ${sortedSlugs.length} unique genre slugs:`)
  sortedSlugs.forEach(slug => console.log(`      - ${slug}`))
  
  // 5. Conclusion
  console.log('\n\n' + '='.repeat(100))
  console.log('📌 CONCLUSION:\n')
  
  if (tmdbCheck.rows[0].count === 0) {
    console.log('   ❌ War & Politics (TMDB ID 10768) does NOT exist in database')
    console.log('   📌 This genre is simply not used by any series in current dataset')
    console.log('   \n   FIX: Remove "war-politics" filter option from UI entirely')
    console.log('        No slug mapping needed - genre genuinely unused')
  } else {
    console.log(`   ✅ War & Politics EXISTS: ${tmdbCheck.rows[0].count} series`)
    console.log('   📌 Check slug pattern from samples above')
    console.log('   \n   FIX: Update UI slug to match database pattern')
  }
}

investigate().catch(console.error).finally(() => process.exit(0))
