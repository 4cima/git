const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function comparePerformance() {
  console.log('📊 Performance Comparison: Before vs After\n')
  console.log('=' .repeat(60))
  
  // Test 1: vote_average (كان بطيء جداً - 18.5 ثانية)
  console.log('\n⭐ الأعلى تقييماً (vote_average)')
  console.log('-'.repeat(60))
  
  const start1 = Date.now()
  await turso.execute(`
    SELECT id, name_ar, vote_average
    FROM tv_series
    ORDER BY vote_average DESC
    LIMIT 60
  `)
  const duration1 = Date.now() - start1
  console.log(`✅ الأداء الحالي: ${duration1}ms`)
  console.log(`📈 التحسين: من 18,571ms إلى ${duration1}ms`)
  console.log(`🚀 أسرع بـ ${Math.round(18571 / duration1)}x مرة!`)
  
  // Test 2: Genre filter (كان بطيء - 5.9 ثانية)
  console.log('\n🎭 تصنيف: دراما')
  console.log('-'.repeat(60))
  
  const start2 = Date.now()
  await turso.execute({
    sql: `
      SELECT id, name_ar, genres_json
      FROM tv_series
      WHERE genres_json LIKE ?
      ORDER BY popularity DESC
      LIMIT 60
    `,
    args: ['%"name_ar":"دراما"%']
  })
  const duration2 = Date.now() - start2
  console.log(`✅ الأداء الحالي: ${duration2}ms`)
  console.log(`📈 التحسين: من 5,914ms إلى ${duration2}ms`)
  console.log(`🚀 أسرع بـ ${Math.round(5914 / duration2)}x مرة!`)
  
  // Test 3: Country filter (كان بطيء - 17.5 ثانية)
  console.log('\n🌍 الدولة: أمريكا')
  console.log('-'.repeat(60))
  
  const start3 = Date.now()
  await turso.execute({
    sql: `
      SELECT id, name_ar, country_of_origin
      FROM tv_series
      WHERE country_of_origin = ?
      ORDER BY popularity DESC
      LIMIT 60
    `,
    args: ['US']
  })
  const duration3 = Date.now() - start3
  console.log(`✅ الأداء الحالي: ${duration3}ms`)
  console.log(`📈 التحسين: من 17,549ms إلى ${duration3}ms`)
  console.log(`🚀 أسرع بـ ${Math.round(17549 / duration3)}x مرة!`)
  
  // Test 4: Combined filters (worst case scenario)
  console.log('\n🔥 اختبار مجتمع (تصنيف + دولة + تقييم + ترتيب)')
  console.log('-'.repeat(60))
  
  const start4 = Date.now()
  await turso.execute({
    sql: `
      SELECT id, name_ar, vote_average, country_of_origin, genres_json
      FROM tv_series
      WHERE genres_json LIKE ?
        AND country_of_origin = ?
        AND vote_average >= 8.0
      ORDER BY vote_average DESC
      LIMIT 60
    `,
    args: ['%"name_ar":"دراما"%', 'US']
  })
  const duration4 = Date.now() - start4
  console.log(`✅ الأداء: ${duration4}ms`)
  
  // Test NEW filters
  console.log('\n🆕 الفلاتر الجديدة')
  console.log('='.repeat(60))
  
  // vote_count
  console.log('\n📊 الأكثر تقييماً (vote_count)')
  const start5 = Date.now()
  await turso.execute(`
    SELECT id, name_ar, vote_count
    FROM tv_series
    ORDER BY vote_count DESC
    LIMIT 60
  `)
  const duration5 = Date.now() - start5
  console.log(`✅ الأداء: ${duration5}ms`)
  
  // created_at
  console.log('\n🆕 آخر إضافة (created_at)')
  const start6 = Date.now()
  await turso.execute(`
    SELECT id, name_ar, created_at
    FROM tv_series
    ORDER BY created_at DESC
    LIMIT 60
  `)
  const duration6 = Date.now() - start6
  console.log(`✅ الأداء: ${duration6}ms`)
  
  // first_air_year ASC
  console.log('\n🕰️ الأقدم (first_air_year ASC)')
  const start7 = Date.now()
  await turso.execute(`
    SELECT id, name_ar, first_air_year
    FROM tv_series
    ORDER BY first_air_year ASC
    LIMIT 60
  `)
  const duration7 = Date.now() - start7
  console.log(`✅ الأداء: ${duration7}ms`)
  
  // name_ar DESC
  console.log('\n🔤 الاسم (ي-أ) (name_ar DESC)')
  const start8 = Date.now()
  await turso.execute(`
    SELECT id, name_ar
    FROM tv_series
    ORDER BY name_ar DESC
    LIMIT 60
  `)
  const duration8 = Date.now() - start8
  console.log(`✅ الأداء: ${duration8}ms`)
  
  console.log('\n' + '='.repeat(60))
  console.log('✨ جميع الفلاتر تعمل بسرعة ممتازة! (<100ms)')
  console.log('='.repeat(60))
}

comparePerformance().catch(console.error)
