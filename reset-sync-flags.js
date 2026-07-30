/**
 * إعادة ضبط synced_to_turso flags
 * يستخدم هذا السكريبت لإعادة البدء من الصفر (fresh start)
 */

const Database = require('better-sqlite3')
const path = require('path')

const localDb = new Database(path.join(__dirname, 'data', '4cima-local.db'))

console.log('═'.repeat(80))
console.log('🔄 إعادة ضبط flags المزامنة')
console.log('═'.repeat(80))
console.log('')

// فحص الوضع الحالي
console.log('📊 الوضع الحالي:')
console.log('─'.repeat(80))

const currentMovies = localDb.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN synced_to_turso = 1 THEN 1 ELSE 0 END) as synced,
    SUM(CASE WHEN synced_to_turso = 0 THEN 1 ELSE 0 END) as unsynced
  FROM movies
  WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
`).get()

const currentSeries = localDb.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN synced_to_turso = 1 THEN 1 ELSE 0 END) as synced,
    SUM(CASE WHEN synced_to_turso = 0 THEN 1 ELSE 0 END) as unsynced
  FROM tv_series
  WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
`).get()

console.log('الأفلام:')
console.log(`  إجمالي: ${currentMovies.total.toLocaleString('en-US')}`)
console.log(`  متزامن (synced=1): ${currentMovies.synced.toLocaleString('en-US')}`)
console.log(`  غير متزامن (synced=0): ${currentMovies.unsynced.toLocaleString('en-US')}`)
console.log('')

console.log('المسلسلات:')
console.log(`  إجمالي: ${currentSeries.total.toLocaleString('en-US')}`)
console.log(`  متزامن (synced=1): ${currentSeries.synced.toLocaleString('en-US')}`)
console.log(`  غير متزامن (synced=0): ${currentSeries.unsynced.toLocaleString('en-US')}`)
console.log('')

// خيارات الإعادة
console.log('═'.repeat(80))
console.log('⚠️  خيارات الإعادة:')
console.log('═'.repeat(80))
console.log('')
console.log('1. إعادة كل الـ flags للأفلام (synced_to_turso = 0 لكل الأفلام)')
console.log('2. إعادة كل الـ flags للمسلسلات (synced_to_turso = 0 لكل المسلسلات)')
console.log('3. إعادة كل الـ flags للأفلام والمسلسلات معاً')
console.log('4. عدم تغيير شيء (خروج)')
console.log('')
console.log('═'.repeat(80))
console.log('💡 ملاحظة: بناءً على التحليل السابق:')
console.log('   - الأفلام متزامنة 100% بشكل صحيح (268,755 في Turso)')
console.log('   - المسلسلات فيها bug (99 فقط في Turso رغم آلاف المحاولات)')
console.log('   - التوصية: إعادة flags المسلسلات فقط (خيار 2)')
console.log('═'.repeat(80))
console.log('')

// الإجراء الموصى به (المسلسلات فقط)
console.log('⚙️  تنفيذ الخيار الموصى به (2): إعادة flags المسلسلات فقط')
console.log('─'.repeat(80))

const result = localDb.prepare(`
  UPDATE tv_series 
  SET synced_to_turso = 0, synced_at = NULL
  WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
`).run()

console.log(`✅ تم إعادة ضبط ${result.changes.toLocaleString('en-US')} مسلسل`)
console.log('')

// التحقق بعد التغيير
const afterReset = localDb.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN synced_to_turso = 1 THEN 1 ELSE 0 END) as synced,
    SUM(CASE WHEN synced_to_turso = 0 THEN 1 ELSE 0 END) as unsynced
  FROM tv_series
  WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
`).get()

console.log('📊 الوضع بعد الإعادة:')
console.log('─'.repeat(80))
console.log('المسلسلات:')
console.log(`  إجمالي: ${afterReset.total.toLocaleString('en-US')}`)
console.log(`  متزامن (synced=1): ${afterReset.synced.toLocaleString('en-US')}`)
console.log(`  غير متزامن (synced=0): ${afterReset.unsynced.toLocaleString('en-US')}`)
console.log('')

console.log('═'.repeat(80))
console.log('✅ جاهز الآن لتشغيل scripts/3-sync-to-turso-FIXED.js')
console.log('═'.repeat(80))

localDb.close()
