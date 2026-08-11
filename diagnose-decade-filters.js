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

async function diagnoseDecadeFilters() {
  console.log('🔍 تشخيص فلاتر العقود (1990s, 2000s)\n')

  // تحديد الفلاتر التي سنختبرها
  const tests = [
    { name: '1990s', from: 1990, to: 1999 },
    { name: '2000s', from: 2000, to: 2010 },
    { name: 'Control (2020+)', from: 2020, to: 2026 }
  ]

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📅 اختبار: ${test.name} (${test.from}-${test.to})`)
    console.log('='.repeat(60))

    // 1. EXPLAIN QUERY PLAN
    console.log('\n📋 EXPLAIN QUERY PLAN:')
    const explain = await turso.execute({
      sql: `
        EXPLAIN QUERY PLAN
        SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
               movies.vote_average, movies.release_year,
               movies.genres_json, movies.overview_ar, movies.original_language
        FROM movies
        WHERE release_year BETWEEN ? AND ?
        ORDER BY popularity DESC
        LIMIT 72 OFFSET 0
      `,
      args: [test.from, test.to]
    })
    
    explain.rows.forEach(row => {
      console.log(`   ${Object.values(row).join(' | ')}`)
    })

    // 2. عد النتائج
    const count = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM movies WHERE release_year BETWEEN ? AND ?`,
      args: [test.from, test.to]
    })
    console.log(`\n📊 عدد الأفلام: ${count.rows[0].count}`)

    // 3. قياس الأداء الفعلي (10 محاولات)
    console.log('\n⏱️  قياس الأداء (10 محاولات):')
    const timings = []
    
    for (let i = 0; i < 10; i++) {
      const start = Date.now()
      await turso.execute({
        sql: `
          SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
                 movies.vote_average, movies.release_year,
                 movies.genres_json, movies.overview_ar, movies.original_language
          FROM movies
          WHERE release_year BETWEEN ? AND ?
          ORDER BY popularity DESC
          LIMIT 72 OFFSET 0
        `,
        args: [test.from, test.to]
      })
      const duration = Date.now() - start
      timings.push(duration)
      process.stdout.write(`   #${i + 1}: ${duration}ms `)
      if ((i + 1) % 3 === 0) console.log()
    }
    
    if (timings.length % 3 !== 0) console.log()
    
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length
    const min = Math.min(...timings)
    const max = Math.max(...timings)
    const median = timings.sort((a, b) => a - b)[Math.floor(timings.length / 2)]
    
    console.log(`\n📈 الإحصائيات:`)
    console.log(`   • المتوسط: ${avg.toFixed(1)}ms`)
    console.log(`   • الأدنى: ${min}ms`)
    console.log(`   • الأعلى: ${max}ms`)
    console.log(`   • المتوسط الوسيط: ${median}ms`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ انتهى التشخيص')
}

diagnoseDecadeFilters().catch(console.error)
