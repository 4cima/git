require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function getGenres() {
  const result = await turso.execute(`
    SELECT DISTINCT json_extract(value, '$.name_ar') as name_ar 
    FROM tv_series, json_each(genres_json) 
    WHERE json_extract(value, '$.name_ar') IS NOT NULL 
    ORDER BY name_ar
  `)
  
  console.log('التصنيفات المتاحة:')
  result.rows.forEach(row => {
    console.log(`  - ${row.name_ar}`)
  })
}

getGenres().catch(console.error)
