import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('عينة من genres_json في الأفلام:\n')

const result = await turso.execute("SELECT title_ar, genres_json FROM movies WHERE genres_json != '[]' AND genres_json IS NOT NULL LIMIT 5")

console.log('\n═══ اختبار استعلام json_extract ═══\n')

// Test actual query
const testQuery = await turso.execute({
  sql: `
    SELECT COUNT(*) as count
    FROM movies
    WHERE EXISTS (
      SELECT 1 FROM json_each(genres_json)
      WHERE CAST(json_extract(value, '$.tmdb_id') AS INTEGER) = ?
    )
  `,
  args: [18]
})

console.log(`عدد أفلام دراما (tmdb_id=18): ${testQuery.rows[0].count}`)

console.log('\n═══ عينة من genres_json في الأفلام ═══\n')

result.rows.forEach((row, i) => {
  console.log(`\nفيلم ${i+1}: ${row.title_ar}`)
  console.log(`JSON: ${row.genres_json}`)
  
  try {
    const genres = JSON.parse(row.genres_json)
    console.log('محتوى:')
    genres.forEach(g => {
      console.log(`  - name_ar: ${g.name_ar}, id: ${g.id}`)
    })
  } catch (e) {
    console.log('خطأ في parsing')
  }
})

await turso.close()
