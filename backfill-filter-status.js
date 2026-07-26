/**
 * الخطوة (b): Backfill البيانات الحالية
 * تحديث filter_status بناءً على is_filtered الموجود
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function main() {
  console.log('📋 الخطوة (b): Backfill filter_status\n')

  // ═══════════════════════════════════════════════════════════
  // 1) local.db - movies
  // ═══════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────')
  console.log('1️⃣  LOCAL.DB → movies')
  console.log('─────────────────────────────────────────────────')
  
  const localDb = new Database('./data/4cima-local.db')
  
  console.log('\n🔧 UPDATE filter_status = "clean" WHERE is_filtered = 0...')
  const localMoviesClean = localDb.prepare(`
    UPDATE movies 
    SET filter_status = 'clean' 
    WHERE is_filtered = 0
  `).run()
  console.log(`   ✅ عدد الصفوف المتأثرة: ${localMoviesClean.changes}`)
  
  console.log('\n🔧 UPDATE filter_status = "blocked" WHERE is_filtered = 1...')
  const localMoviesBlocked = localDb.prepare(`
    UPDATE movies 
    SET filter_status = 'blocked' 
    WHERE is_filtered = 1
  `).run()
  console.log(`   ✅ عدد الصفوف المتأثرة: ${localMoviesBlocked.changes}`)
  
  console.log('\n📊 SELECT COUNT(*) GROUP BY filter_status:')
  const localMoviesCount = localDb.prepare(`
    SELECT filter_status, COUNT(*) as count 
    FROM movies 
    GROUP BY filter_status
  `).all()
  localMoviesCount.forEach(row => {
    console.log(`   ${row.filter_status || 'NULL'}: ${row.count}`)
  })
  
  console.log('\n📊 SELECT COUNT(*) GROUP BY is_filtered (للتحقق):')
  const localMoviesFiltered = localDb.prepare(`
    SELECT is_filtered, COUNT(*) as count 
    FROM movies 
    GROUP BY is_filtered
  `).all()
  localMoviesFiltered.forEach(row => {
    console.log(`   is_filtered=${row.is_filtered}: ${row.count}`)
  })

  // ═══════════════════════════════════════════════════════════
  // 2) local.db - tv_series
  // ═══════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────')
  console.log('2️⃣  LOCAL.DB → tv_series')
  console.log('─────────────────────────────────────────────────')
  
  console.log('\n🔧 UPDATE filter_status = "clean" WHERE is_filtered = 0...')
  const localSeriesClean = localDb.prepare(`
    UPDATE tv_series 
    SET filter_status = 'clean' 
    WHERE is_filtered = 0
  `).run()
  console.log(`   ✅ عدد الصفوف المتأثرة: ${localSeriesClean.changes}`)
  
  console.log('\n🔧 UPDATE filter_status = "blocked" WHERE is_filtered = 1...')
  const localSeriesBlocked = localDb.prepare(`
    UPDATE tv_series 
    SET filter_status = 'blocked' 
    WHERE is_filtered = 1
  `).run()
  console.log(`   ✅ عدد الصفوف المتأثرة: ${localSeriesBlocked.changes}`)
  
  console.log('\n📊 SELECT COUNT(*) GROUP BY filter_status:')
  const localSeriesCount = localDb.prepare(`
    SELECT filter_status, COUNT(*) as count 
    FROM tv_series 
    GROUP BY filter_status
  `).all()
  localSeriesCount.forEach(row => {
    console.log(`   ${row.filter_status || 'NULL'}: ${row.count}`)
  })
  
  console.log('\n📊 SELECT COUNT(*) GROUP BY is_filtered (للتحقق):')
  const localSeriesFiltered = localDb.prepare(`
    SELECT is_filtered, COUNT(*) as count 
    FROM tv_series 
    GROUP BY is_filtered
  `).all()
  localSeriesFiltered.forEach(row => {
    console.log(`   is_filtered=${row.is_filtered}: ${row.count}`)
  })
  
  localDb.close()

  // ═══════════════════════════════════════════════════════════
  // 3) Turso - movies
  // ═══════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────')
  console.log('3️⃣  TURSO → movies')
  console.log('─────────────────────────────────────────────────')
  
  console.log('\n⚠️  ملاحظة: Turso مفيهاش عمود is_filtered أو filter_reason')
  console.log('   كل الصفوف في Turso = محتوى عدّى الفلتر في local.db')
  console.log('   هنحدّث كل filter_status إلى "clean" مباشرة\n')
  
  console.log('🔧 UPDATE filter_status = "clean" لكل الصفوف...')
  const tursoMoviesClean = await turso.execute(`
    UPDATE movies 
    SET filter_status = 'clean'
  `)
  console.log(`   ✅ عدد الصفوف المتأثرة: ${tursoMoviesClean.rowsAffected}`)
  
  console.log('\n📊 SELECT COUNT(*) GROUP BY filter_status:')
  const tursoMoviesCount = await turso.execute(`
    SELECT filter_status, COUNT(*) as count 
    FROM movies 
    GROUP BY filter_status
  `)
  tursoMoviesCount.rows.forEach(row => {
    console.log(`   ${row.filter_status || 'NULL'}: ${row.count}`)
  })
  
  console.log('\n📊 إجمالي movies في Turso:')
  const tursoMoviesTotal = await turso.execute('SELECT COUNT(*) as total FROM movies')
  console.log(`   ${tursoMoviesTotal.rows[0].total}`)

  // ═══════════════════════════════════════════════════════════
  // 4) Turso - tv_series
  // ═══════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────')
  console.log('4️⃣  TURSO → tv_series')
  console.log('─────────────────────────────────────────────────')
  
  console.log('\n🔧 UPDATE filter_status = "clean" لكل الصفوف...')
  const tursoSeriesClean = await turso.execute(`
    UPDATE tv_series 
    SET filter_status = 'clean'
  `)
  console.log(`   ✅ عدد الصفوف المتأثرة: ${tursoSeriesClean.rowsAffected}`)
  
  console.log('\n📊 SELECT COUNT(*) GROUP BY filter_status:')
  const tursoSeriesCount = await turso.execute(`
    SELECT filter_status, COUNT(*) as count 
    FROM tv_series 
    GROUP BY filter_status
  `)
  tursoSeriesCount.rows.forEach(row => {
    console.log(`   ${row.filter_status || 'NULL'}: ${row.count}`)
  })
  
  console.log('\n📊 إجمالي tv_series في Turso:')
  const tursoSeriesTotal = await turso.execute('SELECT COUNT(*) as total FROM tv_series')
  console.log(`   ${tursoSeriesTotal.rows[0].total}`)

  // ═══════════════════════════════════════════════════════════
  // 5) التحقق من الـ6 أفلام المعروفة
  // ═══════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────')
  console.log('5️⃣  التحقق من الـ6 أفلام المعروفة')
  console.log('─────────────────────────────────────────────────')
  
  const knownMovies = [
    { id: 33, title: 'Unforgiven' },
    { id: 103, title: 'Taxi Driver' },
    { id: 115, title: 'The Big Lebowski' },
    { id: 128, title: 'Princess Mononoke' },
    { id: 142, title: 'Brokeback Mountain' },
    { id: 145, title: 'Breaking the Waves' }
  ]
  
  console.log('\n📋 فحص filter_status في Turso:')
  for (const movie of knownMovies) {
    const result = await turso.execute({
      sql: 'SELECT tmdb_id, title_ar, filter_status FROM movies WHERE tmdb_id = ?',
      args: [movie.id]
    })
    if (result.rows.length > 0) {
      const row = result.rows[0]
      const status = row.filter_status === 'clean' ? '✅' : '❌'
      console.log(`   ${status} [${row.tmdb_id}] ${movie.title}`)
      console.log(`       filter_status: ${row.filter_status}`)
    } else {
      console.log(`   ⚠️  [${movie.id}] ${movie.title} — غير موجود في Turso`)
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════')
  console.log('✅ الخطوة (b) اكتملت — راجع الأرقام أعلاه')
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
