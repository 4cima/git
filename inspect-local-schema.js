// فحص هيكل القاعدة المحلية
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const db = new Database(join(__dirname, 'data', '4cima-local.db'))

console.log('🔍 فحص هيكل القاعدة المحلية\n')

// فحص الجداول الموجودة
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all()

console.log('📋 الجداول الموجودة:')
tables.forEach(table => {
  console.log(`   - ${table.name}`)
})

// فحص هيكل جدول movies
if (tables.some(t => t.name === 'movies')) {
  console.log('\n🎬 أعمدة جدول movies:')
  const moviesColumns = db.prepare(`PRAGMA table_info(movies)`).all()
  moviesColumns.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`)
  })
  
  // عدد الأفلام
  const moviesCount = db.prepare(`SELECT COUNT(*) as count FROM movies`).get()
  console.log(`\n   📊 إجمالي الأفلام: ${moviesCount.count}`)
}

// فحص هيكل جدول tv_series
if (tables.some(t => t.name === 'tv_series')) {
  console.log('\n📺 أعمدة جدول tv_series:')
  const seriesColumns = db.prepare(`PRAGMA table_info(tv_series)`).all()
  seriesColumns.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`)
  })
  
  // عدد المسلسلات
  const seriesCount = db.prepare(`SELECT COUNT(*) as count FROM tv_series`).get()
  console.log(`\n   📊 إجمالي المسلسلات: ${seriesCount.count}`)
}

console.log('\n✅ انتهى الفحص')
db.close()
