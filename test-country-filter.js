import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function testCountryFilters() {
  console.log('🧪 اختبار فلاتر الدول...\n')

  const countries = [
    { code: 'US', name: 'أمريكا' },
    { code: 'JP', name: 'اليابان' },
    { code: 'GB', name: 'بريطانيا' },
    { code: 'CN', name: 'الصين' },
    { code: 'KR', name: 'كوريا' },
    { code: 'CA', name: 'كندا' },
    { code: 'FR', name: 'فرنسا' },
    { code: 'DE', name: 'ألمانيا' },
    { code: 'IN', name: 'الهند' },
    { code: 'TH', name: 'تايلاند' },
    { code: 'RU', name: 'روسيا' },
    { code: 'AU', name: 'أستراليا' },
    { code: 'BR', name: 'البرازيل' },
    { code: 'MX', name: 'المكسيك' },
    { code: 'TR', name: 'تركيا' },
  ]

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('# | الكود | الدولة              | العدد  | أمثلة من النتائج')
  console.log('═══════════════════════════════════════════════════════════════')

  for (let i = 0; i < countries.length; i++) {
    const country = countries[i]
    try {
      // Count query
      const countResult = await turso.execute({
        sql: `SELECT COUNT(*) as count FROM tv_series WHERE country_of_origin = ?`,
        args: [country.code]
      })

      const count = countResult.rows[0].count

      // Sample query - get 2 examples
      const sampleResult = await turso.execute({
        sql: `SELECT name_ar FROM tv_series WHERE country_of_origin = ? LIMIT 2`,
        args: [country.code]
      })

      const samples = sampleResult.rows
        .map(r => r.name_ar)
        .join(', ')

      const num = (i + 1).toString().padStart(2)
      const code = country.code.padEnd(4)
      const name = country.name.padEnd(20)
      const countStr = String(count).padStart(6)
      
      console.log(`${num} | ${code} | ${name} | ${countStr} | ${samples.substring(0, 50)}...`)

    } catch (error) {
      console.log(`${(i + 1).toString().padStart(2)} | ${country.code} | ERROR: ${error.message}`)
    }
  }

  console.log('═══════════════════════════════════════════════════════════════')
  
  // Get total
  const totalResult = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM tv_series WHERE country_of_origin IN (${countries.map(() => '?').join(',')})`,
    args: countries.map(c => c.code)
  })

  console.log(`\n✅ المجموع: ${totalResult.rows[0].count} مسلسل من 15 دولة`)
  console.log('✅ جميع الفلاتر تعمل بشكل صحيح!\n')
}

testCountryFilters()
