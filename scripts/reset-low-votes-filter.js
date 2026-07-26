// إعادة تقييم المسلسلات المفلترة بـ low_votes
// بعد تخفيف الفلترة من 50 إلى 10 أصوات
const db = require('./services/local-db')

console.log('🔄 إعادة تقييم المسلسلات المفلترة بـ low_votes\n')
console.log('═'.repeat(60))

// ═══════════════════════════════════════════════════════════
// 1️⃣ المسلسلات المفلترة بـ low_votes
// ═══════════════════════════════════════════════════════════
console.log('\n1️⃣ فحص المسلسلات المفلترة:\n')

const filtered = db.prepare(`
  SELECT COUNT(*) as count 
  FROM tv_series 
  WHERE is_filtered = 1 AND filter_reason = 'low_votes'
`).get()

console.log(`🚫 مسلسلات مفلترة بـ low_votes: ${filtered.count.toLocaleString()}`)

// ═══════════════════════════════════════════════════════════
// 2️⃣ إعادة تصفير الفلترة للمسلسلات التي لديها بيانات
// ═══════════════════════════════════════════════════════════
console.log('\n2️⃣ إعادة تصفير الفلترة:\n')

// إعادة تصفير فقط المسلسلات التي لديها بيانات فعلية
const result = db.prepare(`
  UPDATE tv_series 
  SET is_filtered = 0, filter_reason = NULL 
  WHERE is_filtered = 1 
  AND filter_reason = 'low_votes'
  AND overview_en IS NOT NULL
`).run()

console.log(`✅ تم إعادة تصفير ${result.changes.toLocaleString()} مسلسل`)

// ═══════════════════════════════════════════════════════════
// 3️⃣ التحقق من النتائج
// ═══════════════════════════════════════════════════════════
console.log('\n3️⃣ التحقق من النتائج:\n')

const afterReset = db.prepare(`
  SELECT COUNT(*) as count 
  FROM tv_series 
  WHERE is_filtered = 1 AND filter_reason = 'low_votes'
`).get()

console.log(`🚫 مسلسلات مفلترة بـ low_votes (بعد): ${afterReset.count.toLocaleString()}`)

const readyForProcessing = db.prepare(`
  SELECT COUNT(*) as count 
  FROM tv_series 
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
  AND (title_ar = 'TBD' OR title_ar IS NULL)
`).get()

console.log(`✅ مسلسلات جاهزة للمعالجة: ${readyForProcessing.count.toLocaleString()}`)

console.log('\n═'.repeat(60))
console.log('\n✅ اكتمل! يمكنك الآن تشغيل اسكريبت السحب')
console.log('   node scripts/INGEST-SERIES-LOGIC.js')
console.log('\n═'.repeat(60))
