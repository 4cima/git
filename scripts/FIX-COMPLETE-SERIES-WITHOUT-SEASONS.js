#!/usr/bin/env node

/**
 * إصلاح المسلسلات المكتملة بدون مواسم
 * يعيد ضبط is_complete = 0 للمسلسلات التي لا تملك مواسم
 */

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'data', '4cima-local.db')

console.log('🔧 إصلاح المسلسلات المكتملة بدون مواسم\n')
console.log('='.repeat(70))

const db = new Database(DB_PATH)

// البحث عن المسلسلات المكتملة بدون مواسم
const completeWithoutSeasons = db.prepare(`
  SELECT id, title_en, title_ar FROM tv_series 
  WHERE is_complete = 1 
  AND id NOT IN (SELECT DISTINCT tv_series_id FROM tv_seasons)
`).all()

console.log(`\n📊 وجدنا ${completeWithoutSeasons.length} مسلسل مكتمل بدون مواسم`)

if (completeWithoutSeasons.length === 0) {
  console.log('\n✅ ممتاز! لا توجد مسلسلات مكتملة بدون مواسم!')
  db.close()
  process.exit(0)
}

console.log('\n📋 المسلسلات:')
completeWithoutSeasons.forEach((s, i) => {
  console.log(`   ${i + 1}. [${s.id}] ${s.title_en}`)
})

console.log('\n🔧 إصلاح is_complete...')

// تحديث is_complete = 0
const result = db.prepare(`
  UPDATE tv_series 
  SET is_complete = 0 
  WHERE is_complete = 1 
  AND id NOT IN (SELECT DISTINCT tv_series_id FROM tv_seasons)
`).run()

console.log(`\n✅ تم إصلاح ${result.changes} مسلسل`)

// التحقق
const stillComplete = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series 
  WHERE is_complete = 1 
  AND id NOT IN (SELECT DISTINCT tv_series_id FROM tv_seasons)
`).get()

if (stillComplete.count === 0) {
  console.log('✅ تم الإصلاح بنجاح! لا توجد مسلسلات مكتملة بدون مواسم')
} else {
  console.log(`⚠️ لا يزال هناك ${stillComplete.count} مسلسل مكتمل بدون مواسم!`)
}

db.close()

console.log('\n' + '='.repeat(70))
