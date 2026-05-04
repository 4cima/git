import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.dev.vars' })

async function checkPeacemaker() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
  
  const result = await db.execute(`
    SELECT *
    FROM tv_series 
    WHERE slug = 'peacemaker'
  `)
  
  console.log('\n📺 Peacemaker - ALL DATA:')
  console.log('='.repeat(100))
  
  const data = result.rows[0] as any
  
  // Print all columns
  for (const [key, value] of Object.entries(data)) {
    console.log(`${key}: ${value}`)
  }
  
  console.log('\n' + '='.repeat(100))
  console.log('\n✅ الشروط الـ 8:')
  console.log('1. id:', data.id ? '✅' : '❌')
  console.log('2. name (EN):', data.name ? '✅' : '❌')
  console.log('3. name_ar:', data.name_ar ? '✅' : '❌')
  console.log('4. overview (EN):', data.overview ? '✅' : '❌')
  console.log('5. overview_ar:', data.overview_ar ? '✅' : '❌')
  console.log('6. first_air_date:', data.first_air_date ? '✅' : '❌')
  console.log('7. poster_path:', data.poster_path ? '✅' : '❌')
  console.log('8. slug:', data.slug ? '✅' : '❌')
  console.log('9. primary_genre:', data.primary_genre ? '✅' : '❌')
  console.log('\n🔍 is_complete:', data.is_complete)
}

checkPeacemaker()
