const Database = require('better-sqlite3')
const db = new Database('./data/4cima-local.db')

console.log('🔍 فحص filter_status في local.db\n')

console.log('─────────────────────────────────────────────────')
console.log('1️⃣  MOVIES')
console.log('─────────────────────────────────────────────────\n')

const moviesNull = db.prepare('SELECT COUNT(*) as count FROM movies WHERE filter_status IS NULL').get()
const moviesTotal = db.prepare('SELECT COUNT(*) as count FROM movies').get()
const moviesStatus = db.prepare('SELECT filter_status, COUNT(*) as count FROM movies GROUP BY filter_status').all()

console.log(`📊 إجمالي movies: ${moviesTotal.count}`)
console.log(`❓ filter_status IS NULL: ${moviesNull.count}`)
console.log(`\n📊 توزيع filter_status:`)
moviesStatus.forEach(row => {
  console.log(`   ${row.filter_status || 'NULL'}: ${row.count}`)
})

console.log('\n─────────────────────────────────────────────────')
console.log('2️⃣  TV_SERIES')
console.log('─────────────────────────────────────────────────\n')

const seriesNull = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE filter_status IS NULL').get()
const seriesTotal = db.prepare('SELECT COUNT(*) as count FROM tv_series').get()
const seriesStatus = db.prepare('SELECT filter_status, COUNT(*) as count FROM tv_series GROUP BY filter_status').all()

console.log(`📊 إجمالي tv_series: ${seriesTotal.count}`)
console.log(`❓ filter_status IS NULL: ${seriesNull.count}`)
console.log(`\n📊 توزيع filter_status:`)
seriesStatus.forEach(row => {
  console.log(`   ${row.filter_status || 'NULL'}: ${row.count}`)
})

console.log('\n═══════════════════════════════════════════════════')
if (moviesNull.count === 0 && seriesNull.count === 0) {
  console.log('✅ كل الصفوف عندها filter_status (جاهز للـ sync)')
} else {
  console.log('⚠️  فيه صفوف بدون filter_status — يحتاج backfill قبل الـ sync')
}
console.log('═══════════════════════════════════════════════════\n')

db.close()
