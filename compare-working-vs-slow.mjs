import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

// التصنيفات الشغالة سريع
const fastGenres = ['دراما', 'كوميديا', 'رسوم متحركة']

// التصنيفات البطيئة
const slowGenres = ['رومانسي', 'تاريخي']

console.log('═══════════════════════════════════════════════════════════')
console.log('مقارنة التصنيفات السريعة vs البطيئة')
console.log('═══════════════════════════════════════════════════════════\n')

async function testGenre(genre) {
  const start = Date.now()
  
  const result = await turso.execute({
    sql: `
      SELECT COUNT(*) as count 
      FROM tv_series 
      WHERE genres_json LIKE ?
      LIMIT 1000
    `,
    args: [`%"name_ar":"${genre}"%`]
  })
  
  const time = Date.now() - start
  const count = result.rows[0].count
  
  return { genre, time, count }
}

console.log('🟢 التصنيفات السريعة:\n')
for (const genre of fastGenres) {
  const result = await testGenre(genre)
  console.log(`  ${result.genre}: ${result.time}ms (${result.count} مسلسل)`)
}

console.log('\n🔴 التصنيفات البطيئة:\n')
for (const genre of slowGenres) {
  const result = await testGenre(genre)
  console.log(`  ${result.genre}: ${result.time}ms (${result.count} مسلسل)`)
}

// الآن نشوف مواقعهم في الجدول
console.log('\n═══════════════════════════════════════════════════════════')
console.log('موقع أول مسلسل لكل تصنيف في الجدول')
console.log('═══════════════════════════════════════════════════════════\n')

console.log('🟢 التصنيفات السريعة:\n')
for (const genre of fastGenres) {
  const result = await turso.execute({
    sql: `SELECT id, name_ar FROM tv_series WHERE genres_json LIKE ? LIMIT 1`,
    args: [`%"name_ar":"${genre}"%`]
  })
  
  if (result.rows.length > 0) {
    console.log(`  ${genre}: ID ${result.rows[0].id} - ${result.rows[0].name_ar}`)
  }
}

console.log('\n🔴 التصنيفات البطيئة:\n')
for (const genre of slowGenres) {
  const result = await turso.execute({
    sql: `SELECT id, name_ar FROM tv_series WHERE genres_json LIKE ? LIMIT 1`,
    args: [`%"name_ar":"${genre}"%`]
  })
  
  if (result.rows.length > 0) {
    console.log(`  ${genre}: ID ${result.rows[0].id} - ${result.rows[0].name_ar}`)
  }
}

// نشوف أول 5 IDs وآخر 5 IDs في الجدول
console.log('\n═══════════════════════════════════════════════════════════')
console.log('نطاق الـ IDs في جدول tv_series')
console.log('═══════════════════════════════════════════════════════════\n')

const minMax = await turso.execute('SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as total FROM tv_series')
console.log(`  أصغر ID: ${minMax.rows[0].min_id}`)
console.log(`  أكبر ID: ${minMax.rows[0].max_id}`)
console.log(`  إجمالي المسلسلات: ${minMax.rows[0].total}`)

await turso.close()
