import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('التصنيفات في جدول genres:\n')

const result = await turso.execute('SELECT * FROM genres ORDER BY name_ar LIMIT 30')

result.rows.forEach(row => {
  console.log(`${row.name_ar} (${row.name_en}) - tmdb_id: ${row.tmdb_id}`)
})

console.log('\n\nالتصنيفات الموجودة فعلياً في genres_json المسلسلات (عينة):\n')

const sample = await turso.execute('SELECT DISTINCT genres_json FROM tv_series WHERE genres_json IS NOT NULL AND genres_json != \'[]\' LIMIT 5')

sample.rows.forEach((row, i) => {
  console.log(`\nمسلسل ${i+1}:`)
  try {
    const genres = JSON.parse(row.genres_json)
    genres.forEach(g => console.log(`  - ${g.name_ar || g.name} (ID: ${g.id})`))
  } catch (e) {
    console.log('  خطأ في parsing')
  }
})

await turso.close()
