/**
 * إضافة عمود filter_status إلى local.db و Turso
 * الخطوة (a) فقط — التحقق من الإضافة بـ PRAGMA
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function main() {
  console.log('📋 الخطوة (a): إضافة عمود filter_status\n')

  // ═══════════════════════════════════════════════════════════
  // 1) local.db
  // ═══════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────')
  console.log('1️⃣  LOCAL.DB')
  console.log('─────────────────────────────────────────────────')
  
  const localDb = new Database('./data/4cima-local.db')
  
  // فحص الـ schema قبل التعديل
  console.log('\n📌 Schema قبل التعديل (movies):')
  const beforeMovies = localDb.prepare('PRAGMA table_info(movies)').all()
  const hasFilterStatusMovies = beforeMovies.some(col => col.name === 'filter_status')
  console.log(`   عمود filter_status موجود؟ ${hasFilterStatusMovies ? '✅ نعم' : '❌ لا'}`)
  
  console.log('\n📌 Schema قبل التعديل (tv_series):')
  const beforeSeries = localDb.prepare('PRAGMA table_info(tv_series)').all()
  const hasFilterStatusSeries = beforeSeries.some(col => col.name === 'filter_status')
  console.log(`   عمود filter_status موجود؟ ${hasFilterStatusSeries ? '✅ نعم' : '❌ لا'}`)
  
  // إضافة العمود (movies)
  if (!hasFilterStatusMovies) {
    console.log('\n🔧 إضافة filter_status إلى movies...')
    localDb.exec(`
      ALTER TABLE movies 
      ADD COLUMN filter_status TEXT DEFAULT 'clean'
    `)
    console.log('   ✅ تم')
  } else {
    console.log('\n⏭️  العمود موجود مسبقاً في movies')
  }
  
  // إضافة العمود (tv_series)
  if (!hasFilterStatusSeries) {
    console.log('\n🔧 إضافة filter_status إلى tv_series...')
    localDb.exec(`
      ALTER TABLE tv_series 
      ADD COLUMN filter_status TEXT DEFAULT 'clean'
    `)
    console.log('   ✅ تم')
  } else {
    console.log('\n⏭️  العمود موجود مسبقاً في tv_series')
  }
  
  // التحقق النهائي بـ PRAGMA (movies)
  console.log('\n📋 PRAGMA table_info(movies) بعد التعديل:')
  const afterMovies = localDb.prepare('PRAGMA table_info(movies)').all()
  const filterStatusColMovies = afterMovies.find(col => col.name === 'filter_status')
  if (filterStatusColMovies) {
    console.log('   ✅ filter_status موجود:')
    console.log(`      - cid: ${filterStatusColMovies.cid}`)
    console.log(`      - name: ${filterStatusColMovies.name}`)
    console.log(`      - type: ${filterStatusColMovies.type}`)
    console.log(`      - notnull: ${filterStatusColMovies.notnull}`)
    console.log(`      - dflt_value: ${filterStatusColMovies.dflt_value}`)
  } else {
    console.log('   ❌ filter_status غير موجود!')
  }
  
  // التحقق النهائي بـ PRAGMA (tv_series)
  console.log('\n📋 PRAGMA table_info(tv_series) بعد التعديل:')
  const afterSeries = localDb.prepare('PRAGMA table_info(tv_series)').all()
  const filterStatusColSeries = afterSeries.find(col => col.name === 'filter_status')
  if (filterStatusColSeries) {
    console.log('   ✅ filter_status موجود:')
    console.log(`      - cid: ${filterStatusColSeries.cid}`)
    console.log(`      - name: ${filterStatusColSeries.name}`)
    console.log(`      - type: ${filterStatusColSeries.type}`)
    console.log(`      - notnull: ${filterStatusColSeries.notnull}`)
    console.log(`      - dflt_value: ${filterStatusColSeries.dflt_value}`)
  } else {
    console.log('   ❌ filter_status غير موجود!')
  }
  
  localDb.close()

  // ═══════════════════════════════════════════════════════════
  // 2) Turso
  // ═══════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────')
  console.log('2️⃣  TURSO')
  console.log('─────────────────────────────────────────────────')
  
  // فحص الـ schema قبل التعديل (movies)
  console.log('\n📌 Schema قبل التعديل (movies):')
  const tursoBeforeMovies = await turso.execute('PRAGMA table_info(movies)')
  const tursoHasFilterStatusMovies = tursoBeforeMovies.rows.some(col => col.name === 'filter_status')
  console.log(`   عمود filter_status موجود؟ ${tursoHasFilterStatusMovies ? '✅ نعم' : '❌ لا'}`)
  
  // فحص الـ schema قبل التعديل (tv_series)
  console.log('\n📌 Schema قبل التعديل (tv_series):')
  const tursoBeforeSeries = await turso.execute('PRAGMA table_info(tv_series)')
  const tursoHasFilterStatusSeries = tursoBeforeSeries.rows.some(col => col.name === 'filter_status')
  console.log(`   عمود filter_status موجود؟ ${tursoHasFilterStatusSeries ? '✅ نعم' : '❌ لا'}`)
  
  // إضافة العمود (movies)
  if (!tursoHasFilterStatusMovies) {
    console.log('\n🔧 إضافة filter_status إلى movies في Turso...')
    await turso.execute(`
      ALTER TABLE movies 
      ADD COLUMN filter_status TEXT DEFAULT 'clean'
    `)
    console.log('   ✅ تم')
  } else {
    console.log('\n⏭️  العمود موجود مسبقاً في movies')
  }
  
  // إضافة العمود (tv_series)
  if (!tursoHasFilterStatusSeries) {
    console.log('\n🔧 إضافة filter_status إلى tv_series في Turso...')
    await turso.execute(`
      ALTER TABLE tv_series 
      ADD COLUMN filter_status TEXT DEFAULT 'clean'
    `)
    console.log('   ✅ تم')
  } else {
    console.log('\n⏭️  العمود موجود مسبقاً في tv_series')
  }
  
  // التحقق النهائي بـ PRAGMA (movies)
  console.log('\n📋 PRAGMA table_info(movies) بعد التعديل:')
  const tursoAfterMovies = await turso.execute('PRAGMA table_info(movies)')
  const tursoFilterStatusColMovies = tursoAfterMovies.rows.find(col => col.name === 'filter_status')
  if (tursoFilterStatusColMovies) {
    console.log('   ✅ filter_status موجود:')
    console.log(`      - cid: ${tursoFilterStatusColMovies.cid}`)
    console.log(`      - name: ${tursoFilterStatusColMovies.name}`)
    console.log(`      - type: ${tursoFilterStatusColMovies.type}`)
    console.log(`      - notnull: ${tursoFilterStatusColMovies.notnull}`)
    console.log(`      - dflt_value: ${tursoFilterStatusColMovies.dflt_value}`)
  } else {
    console.log('   ❌ filter_status غير موجود!')
  }
  
  // التحقق النهائي بـ PRAGMA (tv_series)
  console.log('\n📋 PRAGMA table_info(tv_series) بعد التعديل:')
  const tursoAfterSeries = await turso.execute('PRAGMA table_info(tv_series)')
  const tursoFilterStatusColSeries = tursoAfterSeries.rows.find(col => col.name === 'filter_status')
  if (tursoFilterStatusColSeries) {
    console.log('   ✅ filter_status موجود:')
    console.log(`      - cid: ${tursoFilterStatusColSeries.cid}`)
    console.log(`      - name: ${tursoFilterStatusColSeries.name}`)
    console.log(`      - type: ${tursoFilterStatusColSeries.type}`)
    console.log(`      - notnull: ${tursoFilterStatusColSeries.notnull}`)
    console.log(`      - dflt_value: ${tursoFilterStatusColSeries.dflt_value}`)
  } else {
    console.log('   ❌ filter_status غير موجود!')
  }
  
  console.log('\n═══════════════════════════════════════════════════')
  console.log('✅ الخطوة (a) اكتملت — تحقق من النتائج أعلاه')
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
