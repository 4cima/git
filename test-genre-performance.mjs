import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const genres = [
  'دراما',
  'كوميديا', 
  'رسوم متحركة',
  'أكشن ومغامرة',
  'رومانسي',
  'تاريخي'
]

console.log('═══════════════════════════════════════════════════════════')
console.log('اختبار سرعة فلترة التصنيفات في المسلسلات')
console.log('═══════════════════════════════════════════════════════════\n')

for (const genre of genres) {
  console.log(`\n🔍 اختبار: ${genre}`)
  console.log('─────────────────────────────────────────────────────────')
  
  // الطريقة القديمة: LIKE على string
  const startOld = Date.now()
  try {
    const resultOld = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM tv_series WHERE genres_json LIKE ?`,
      args: [`%"name_ar":"${genre}"%`]
    })
    const timeOld = Date.now() - startOld
    console.log(`  ❌ الطريقة القديمة (LIKE): ${timeOld}ms - عدد النتائج: ${resultOld.rows[0].count}`)
  } catch (err) {
    console.log(`  ❌ الطريقة القديمة: فشلت - ${err.message}`)
  }
  
  // الطريقة الجديدة: lookup tmdb_id ثم json_each
  const startNew = Date.now()
  try {
    // الخطوة 1: lookup tmdb_id
    const genreResult = await turso.execute({
      sql: 'SELECT tmdb_id FROM genres WHERE name_ar = ? LIMIT 1',
      args: [genre]
    })
    
    if (genreResult.rows.length > 0) {
      const tmdbId = genreResult.rows[0].tmdb_id
      
      // الخطوة 2: البحث بالـ tmdb_id
      const resultNew = await turso.execute({
        sql: `
          SELECT COUNT(*) as count 
          FROM tv_series 
          WHERE EXISTS (
            SELECT 1 FROM json_each(genres_json)
            WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
          )
        `,
        args: [tmdbId]
      })
      
      const timeNew = Date.now() - startNew
      console.log(`  ✅ الطريقة الجديدة (json_each): ${timeNew}ms - عدد النتائج: ${resultNew.rows[0].count}`)
      
      const improvement = timeOld ? ((timeOld - timeNew) / timeOld * 100).toFixed(1) : 'N/A'
      if (timeOld > timeNew) {
        console.log(`  📊 التحسين: ${improvement}% أسرع`)
      } else {
        console.log(`  ⚠️  أبطأ بـ ${((timeNew - timeOld) / timeOld * 100).toFixed(1)}%`)
      }
    } else {
      console.log(`  ⚠️  التصنيف مش موجود في جدول genres`)
    }
  } catch (err) {
    console.log(`  ❌ الطريقة الجديدة: فشلت - ${err.message}`)
  }
}

console.log('\n═══════════════════════════════════════════════════════════')

await turso.close()
