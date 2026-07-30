#!/usr/bin/env node
const db = require('./scripts/services/local-db')

const total = db.prepare('SELECT COUNT(*) as c FROM tv_series').get()
const fetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_fetched = 1').get()
const notFetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_fetched = 0').get()

console.log('═══════════════════════════════════════════')
console.log('📊 حالة المسلسلات في local.db')
console.log('═══════════════════════════════════════════\n')

console.log('إجمالي المسلسلات في الجدول:', total.c.toLocaleString())
console.log('is_fetched = 1:', fetched.c.toLocaleString())
console.log('is_fetched = 0:', notFetched.c.toLocaleString())

console.log('\n📋 عينة من is_fetched=0:')
const sample = db.prepare('SELECT tmdb_id, name_en, is_fetched FROM tv_series WHERE is_fetched = 0 LIMIT 10').all()
sample.forEach(s => {
  console.log(`  ${s.tmdb_id}: ${s.name_en || '(no name)'} (is_fetched=${s.is_fetched})`)
})

console.log('\n❓ التشخيص:')
if (notFetched.c > 0) {
  console.log(`✅ يوجد ${notFetched.c.toLocaleString()} مسلسل جاهز للسحب`)
  console.log('   المشكلة: السكريبت لم يسحبهم رغم وجودهم!')
} else {
  console.log('❌ لا توجد مسلسلات بـ is_fetched=0')
  console.log('   المشكلة: الـ227K مسلسل مش موجودين في الجدول!')
  console.log('   الحل: نحتاج discover script لاكتشافهم من TMDB أولاً')
}
