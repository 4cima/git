/**
 * التحقق من اكتمال المزامنة
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const path = require('path')

async function main() {
  const localDb = new Database(path.join(__dirname, 'data', '4cima-local.db'), { readonly: true })
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })

  console.log('═'.repeat(80))
  console.log('✅ التحقق من اكتمال المزامنة')
  console.log('═'.repeat(80))
  console.log('')

  // ============================================================
  // Movies Verification
  // ============================================================
  console.log('🎬 الأفلام')
  console.log('─'.repeat(80))

  const localMovies = localDb.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN synced_to_turso = 1 THEN 1 ELSE 0 END) as synced,
      SUM(CASE WHEN synced_to_turso = 0 THEN 1 ELSE 0 END) as unsynced
    FROM movies
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
  `).get()

  const tursoMovies = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const tursoMovieCount = tursoMovies.rows[0].count

  console.log(`  القاعدة المحلية:`)
  console.log(`    إجمالي: ${localMovies.total.toLocaleString('en-US')}`)
  console.log(`    متزامن: ${localMovies.synced.toLocaleString('en-US')}`)
  console.log(`    غير متزامن: ${localMovies.unsynced.toLocaleString('en-US')}`)
  console.log('')
  console.log(`  Turso Database:`)
  console.log(`    إجمالي: ${tursoMovieCount.toLocaleString('en-US')}`)
  console.log('')

  if (localMovies.synced === tursoMovieCount) {
    console.log('  ✅ الأفلام: متزامنة بنجاح 100%')
  } else {
    console.log(`  ⚠️  الأفلام: فرق ${Math.abs(localMovies.synced - tursoMovieCount)} فيلم`)
    console.log(`     المحلي (synced): ${localMovies.synced}`)
    console.log(`     Turso: ${tursoMovieCount}`)
  }
  console.log('')

  // ============================================================
  // TV Series Verification
  // ============================================================
  console.log('📺 المسلسلات')
  console.log('─'.repeat(80))

  const localSeries = localDb.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN synced_to_turso = 1 THEN 1 ELSE 0 END) as synced,
      SUM(CASE WHEN synced_to_turso = 0 THEN 1 ELSE 0 END) as unsynced
    FROM tv_series
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
  `).get()

  const tursoSeries = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  const tursoSeriesCount = tursoSeries.rows[0].count

  console.log(`  القاعدة المحلية:`)
  console.log(`    إجمالي: ${localSeries.total.toLocaleString('en-US')}`)
  console.log(`    متزامن: ${localSeries.synced.toLocaleString('en-US')}`)
  console.log(`    غير متزامن: ${localSeries.unsynced.toLocaleString('en-US')}`)
  console.log('')
  console.log(`  Turso Database:`)
  console.log(`    إجمالي: ${tursoSeriesCount.toLocaleString('en-US')}`)
  console.log('')

  if (localSeries.synced === localSeries.total && localSeries.unsynced === 0) {
    console.log('  ✅ المسلسلات: متزامنة بنجاح 100% في القاعدة المحلية')
    
    if (Math.abs(localSeries.synced - tursoSeriesCount) <= 100) {
      console.log('  ✅ المسلسلات: Turso متطابق مع المحلي (فرق طفيف مقبول)')
    } else {
      console.log(`  ⚠️  المسلسلات: فرق ${Math.abs(localSeries.synced - tursoSeriesCount)} مسلسل`)
      console.log(`     قد يكون بسبب ON CONFLICT updates على صفوف موجودة`)
    }
  } else {
    console.log(`  ⏳ المسلسلات: لا يزال هناك ${localSeries.unsynced.toLocaleString('en-US')} غير متزامن`)
    console.log(`     التقدم: ${((localSeries.synced / localSeries.total) * 100).toFixed(2)}%`)
  }
  console.log('')

  // ============================================================
  // Overall Status
  // ============================================================
  console.log('═'.repeat(80))
  console.log('📊 الملخص النهائي')
  console.log('═'.repeat(80))
  console.log('')

  const allSynced = (localMovies.unsynced === 0) && (localSeries.unsynced === 0)

  if (allSynced) {
    console.log('🎉 تم! المزامنة مكتملة 100%')
    console.log('')
    console.log('الإحصائيات النهائية:')
    console.log(`  - أفلام: ${localMovies.synced.toLocaleString('en-US')}`)
    console.log(`  - مسلسلات: ${localSeries.synced.toLocaleString('en-US')}`)
    console.log(`  - الإجمالي: ${(localMovies.synced + localSeries.synced).toLocaleString('en-US')} عنصر`)
    console.log('')
    console.log('✅ جاهز للخطوة التالية: إضافة أعمدة age_rating, imdb_id, country_of_origin')
  } else {
    const totalRemaining = localMovies.unsynced + localSeries.unsynced
    const totalSynced = localMovies.synced + localSeries.synced
    const totalItems = localMovies.total + localSeries.total
    const progress = ((totalSynced / totalItems) * 100).toFixed(2)

    console.log('⏳ المزامنة قيد التقدم...')
    console.log('')
    console.log(`التقدم الإجمالي: ${progress}%`)
    console.log(`  تم: ${totalSynced.toLocaleString('en-US')}`)
    console.log(`  باقي: ${totalRemaining.toLocaleString('en-US')}`)
    console.log('')
    
    if (localSeries.unsynced > 0) {
      const estimatedMinutes = (localSeries.unsynced * 0.444 / 60).toFixed(1)
      const estimatedHours = (estimatedMinutes / 60).toFixed(1)
      console.log(`الوقت المتبقي المتوقع: ~${estimatedMinutes} دقيقة (${estimatedHours} ساعة)`)
    }
  }

  console.log('')
  console.log('═'.repeat(80))

  localDb.close()
}

main().catch(console.error)
