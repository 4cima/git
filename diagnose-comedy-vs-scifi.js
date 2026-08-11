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

async function diagnose() {
  console.log('🔍 Diagnosing why some genres cause timeout\n')
  
  const genres = ['drama', 'comedy', 'science-fiction', 'horror', 'animation']
  
  for (const genre of genres) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Genre: ${genre}`)
    console.log('='.repeat(60))
    
    // Count
    const countSql = `SELECT COUNT(*) as count FROM movies WHERE genres_json LIKE ?`
    const args = [`%"slug":"${genre}"%`]
    const count = await turso.execute({ sql: countSql, args })
    console.log(`Result count: ${count.rows[0].count}`)
    
    // EXPLAIN
    const sql = `
      SELECT movies.id, movies.slug, movies.title_ar, movies.poster_path
      FROM movies
      WHERE genres_json LIKE ?
      ORDER BY popularity DESC
      LIMIT 72
    `
    
    console.log('\nEXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `EXPLAIN QUERY PLAN ${sql}`,
      args
    })
    explain.rows.forEach(row => {
      console.log(`  ${Object.values(row).join(' | ')}`)
    })
    
    // Time the actual query
    console.log('\nDirect DB timing (3 runs):')
    const timings = []
    for (let i = 1; i <= 3; i++) {
      const start = Date.now()
      await turso.execute({ sql, args })
      const duration = Date.now() - start
      timings.push(duration)
      console.log(`  Run ${i}: ${duration}ms`)
    }
    const avg = timings.reduce((a,b) => a+b, 0) / timings.length
    console.log(`  Average: ${avg.toFixed(0)}ms`)
  }
}

diagnose().catch(console.error)
