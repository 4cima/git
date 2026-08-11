import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('═══════════════════════════════════════════════════════════')
console.log('اختبار سريع للفلاتر (fetch 20 نتيجة فقط - بدون COUNT)')
console.log('═══════════════════════════════════════════════════════════\n')

async function quickTest(name, sql, args) {
  const start = Date.now()
  try {
    const result = await turso.execute({ sql, args })
    const time = Date.now() - start
    const count = result.rows.length
    
    const status = time < 500 ? '🟢' : time < 2000 ? '🟡' : time < 5000 ? '🟠' : '🔴'
    const emoji = count > 0 ? '✅' : '❌'
    
    console.log(`${emoji} ${status} ${name.padEnd(25)} ${time}ms - ${count} نتيجة`)
    return { name, time, count }
  } catch (err) {
    console.log(`❌ ❌ ${name.padEnd(25)} خطأ: ${err.message.substring(0, 50)}`)
    return { name, time: -1, count: 0 }
  }
}

console.log('🎬 الأفلام - فلتر التصنيف:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('دراما', `SELECT id FROM movies WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"دراما"%`])
await quickTest('كوميديا', `SELECT id FROM movies WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"كوميديا"%`])
await quickTest('أكشن', `SELECT id FROM movies WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"أكشن"%`])
await quickTest('رومانسي', `SELECT id FROM movies WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"رومانسي"%`])
await quickTest('رعب', `SELECT id FROM movies WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"رعب"%`])

console.log('\n🎬 الأفلام - فلتر السنة:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('2026', `SELECT id FROM movies WHERE release_year = 2026 LIMIT 20`, [])
await quickTest('2024', `SELECT id FROM movies WHERE release_year = 2024 LIMIT 20`, [])
await quickTest('2020', `SELECT id FROM movies WHERE release_year = 2020 LIMIT 20`, [])
await quickTest('الألفينات', `SELECT id FROM movies WHERE release_year BETWEEN 2000 AND 2010 LIMIT 20`, [])

console.log('\n🎬 الأفلام - فلتر التقييم:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('9.1-10 مذهل', `SELECT id FROM movies WHERE vote_average BETWEEN 9.1 AND 10 LIMIT 20`, [])
await quickTest('8.1-9 ممتاز', `SELECT id FROM movies WHERE vote_average BETWEEN 8.1 AND 9 LIMIT 20`, [])
await quickTest('7.1-8 جيد جداً', `SELECT id FROM movies WHERE vote_average BETWEEN 7.1 AND 8 LIMIT 20`, [])

console.log('\n🎬 الأفلام - فلتر الدولة:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('أمريكا (US)', `SELECT id FROM movies WHERE countries_json LIKE '%US%' LIMIT 20`, [])
await quickTest('اليابان (JP)', `SELECT id FROM movies WHERE countries_json LIKE '%JP%' LIMIT 20`, [])
await quickTest('كوريا (KR)', `SELECT id FROM movies WHERE countries_json LIKE '%KR%' LIMIT 20`, [])

console.log('\n🎬 الأفلام - فلتر الترتيب:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('الأكثر شهرة', `SELECT id FROM movies ORDER BY popularity DESC LIMIT 20`, [])
await quickTest('الأعلى تقييماً', `SELECT id FROM movies ORDER BY vote_average DESC LIMIT 20`, [])
await quickTest('الأحدث', `SELECT id FROM movies ORDER BY release_year DESC LIMIT 20`, [])

console.log('\n\n📺 المسلسلات - فلتر التصنيف:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('دراما', `SELECT id FROM tv_series WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"دراما"%`])
await quickTest('كوميديا', `SELECT id FROM tv_series WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"كوميديا"%`])
await quickTest('رسوم متحركة', `SELECT id FROM tv_series WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"رسوم متحركة"%`])
await quickTest('رومانسي', `SELECT id FROM tv_series WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"رومانسي"%`])
await quickTest('تاريخي', `SELECT id FROM tv_series WHERE genres_json LIKE ? LIMIT 20`, [`%"name_ar":"تاريخي"%`])

console.log('\n📺 المسلسلات - فلتر السنة:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('2026', `SELECT id FROM tv_series WHERE first_air_year = 2026 LIMIT 20`, [])
await quickTest('2024', `SELECT id FROM tv_series WHERE first_air_year = 2024 LIMIT 20`, [])
await quickTest('2020', `SELECT id FROM tv_series WHERE first_air_year = 2020 LIMIT 20`, [])

console.log('\n📺 المسلسلات - فلتر التقييم:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('9.1-10 مذهل', `SELECT id FROM tv_series WHERE vote_average BETWEEN 9.1 AND 10 LIMIT 20`, [])
await quickTest('8.1-9 ممتاز', `SELECT id FROM tv_series WHERE vote_average BETWEEN 8.1 AND 9 LIMIT 20`, [])
await quickTest('7.1-8 جيد جداً', `SELECT id FROM tv_series WHERE vote_average BETWEEN 7.1 AND 8 LIMIT 20`, [])

console.log('\n📺 المسلسلات - فلتر الدولة:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('أمريكا (US)', `SELECT id FROM tv_series WHERE country_of_origin = 'US' LIMIT 20`, [])
await quickTest('اليابان (JP)', `SELECT id FROM tv_series WHERE country_of_origin = 'JP' LIMIT 20`, [])
await quickTest('كوريا (KR)', `SELECT id FROM tv_series WHERE country_of_origin = 'KR' LIMIT 20`, [])

console.log('\n📺 المسلسلات - فلتر الترتيب:')
console.log('─────────────────────────────────────────────────────────')
await quickTest('الأكثر شهرة', `SELECT id FROM tv_series ORDER BY popularity DESC LIMIT 20`, [])
await quickTest('الأعلى تقييماً', `SELECT id FROM tv_series ORDER BY vote_average DESC LIMIT 20`, [])
await quickTest('الأحدث', `SELECT id FROM tv_series ORDER BY first_air_year DESC LIMIT 20`, [])

console.log('\n═══════════════════════════════════════════════════════════')

await turso.close()
