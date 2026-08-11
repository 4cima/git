import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function quickSummary() {
  console.log('\n📊 ملخص سريع لقاعدة البيانات\n')
  
  // Tables with counts only
  const tables = ['movies', 'tv_series', 'genres', 'people', 'seasons', 'episodes', 'countries', 'languages']
  
  for (const table of tables) {
    try {
      const result = await turso.execute(`SELECT COUNT(*) as cnt FROM ${table}`)
      console.log(`${table}: ${result.rows[0].cnt.toLocaleString()}`)
    } catch (e) {
      console.log(`${table}: لا يوجد`)
    }
  }
  
  console.log('\n✅ تم')
}

quickSummary().catch(console.error)
