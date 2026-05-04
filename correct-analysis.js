const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

console.log('🔍 التحليل الصحيح\n');
console.log('═'.repeat(80));

// ═══════════════════════════════════════════════════════════════════════════════
// الأفلام
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n🎬 الأفلام:\n');

const m_total = db.prepare('SELECT COUNT(*) as c FROM movies').get();
console.log(`📦 إجمالي IDs: ${m_total.c.toLocaleString()}`);

// تقسيم الأفلام حسب حالة السحب والفلترة
const m_fetched_not_filtered = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
`).get();

const m_fetched_filtered = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 1
`).get();

const m_not_fetched_filtered = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE overview_en IS NULL 
  AND is_filtered = 1
`).get();

const m_not_fetched_not_filtered = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE overview_en IS NULL 
  AND is_filtered = 0
`).get();

console.log('\n📊 التقسيم الصحيح:');
console.log(`   ✅ مسحوب + غير مفلتر: ${m_fetched_not_filtered.c.toLocaleString()}`);
console.log(`   ✅ مسحوب + مفلتر: ${m_fetched_filtered.c.toLocaleString()}`);
console.log(`   ❌ لم يُسحب + مفلتر: ${m_not_fetched_filtered.c.toLocaleString()}`);
console.log(`   ❌ لم يُسحب + غير مفلتر: ${m_not_fetched_not_filtered.c.toLocaleString()}`);

const m_sum = m_fetched_not_filtered.c + m_fetched_filtered.c + m_not_fetched_filtered.c + m_not_fetched_not_filtered.c;
console.log(`\n🔢 المجموع: ${m_sum.toLocaleString()} (يجب أن يساوي ${m_total.c.toLocaleString()})`);
console.log(`✅ التحقق: ${m_sum === m_total.c ? 'صحيح' : 'خطأ!'}`);

// إحصائيات إضافية
const m_complete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 1').get();
console.log(`\n📈 مكتمل: ${m_complete.c.toLocaleString()} (${((m_complete.c / m_fetched_not_filtered.c) * 100).toFixed(1)}% من المسحوب غير المفلتر)`);

// ═══════════════════════════════════════════════════════════════════════════════
// المسلسلات
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n\n📺 المسلسلات:\n');

const s_total = db.prepare('SELECT COUNT(*) as c FROM tv_series').get();
console.log(`📦 إجمالي IDs: ${s_total.c.toLocaleString()}`);

// تقسيم المسلسلات حسب حالة السحب والفلترة
const s_fetched_not_filtered = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0
`).get();

const s_fetched_filtered = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 1
`).get();

const s_not_fetched_filtered = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE overview_en IS NULL 
  AND is_filtered = 1
`).get();

const s_not_fetched_not_filtered = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE overview_en IS NULL 
  AND is_filtered = 0
`).get();

console.log('\n📊 التقسيم الصحيح:');
console.log(`   ✅ مسحوب + غير مفلتر: ${s_fetched_not_filtered.c.toLocaleString()}`);
console.log(`   ✅ مسحوب + مفلتر: ${s_fetched_filtered.c.toLocaleString()}`);
console.log(`   ❌ لم يُسحب + مفلتر: ${s_not_fetched_filtered.c.toLocaleString()}`);
console.log(`   ❌ لم يُسحب + غير مفلتر: ${s_not_fetched_not_filtered.c.toLocaleString()}`);

const s_sum = s_fetched_not_filtered.c + s_fetched_filtered.c + s_not_fetched_filtered.c + s_not_fetched_not_filtered.c;
console.log(`\n🔢 المجموع: ${s_sum.toLocaleString()} (يجب أن يساوي ${s_total.c.toLocaleString()})`);
console.log(`✅ التحقق: ${s_sum === s_total.c ? 'صحيح' : 'خطأ!'}`);

// إحصائيات إضافية
const s_complete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 1').get();
console.log(`\n📈 مكتمل: ${s_complete.c.toLocaleString()} (${((s_complete.c / s_fetched_not_filtered.c) * 100).toFixed(1)}% من المسحوب غير المفلتر)`);

// ═══════════════════════════════════════════════════════════════════════════════
// الملخص النهائي
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n\n📊 الملخص النهائي:\n');
console.log('═'.repeat(80));

const total_works = m_total.c + s_total.c;
const total_fetched = m_fetched_not_filtered.c + m_fetched_filtered.c + s_fetched_not_filtered.c + s_fetched_filtered.c;
const total_complete = m_complete.c + s_complete.c;
const total_filtered = m_fetched_filtered.c + m_not_fetched_filtered.c + s_fetched_filtered.c + s_not_fetched_filtered.c;

console.log(`📦 إجمالي الأعمال: ${total_works.toLocaleString()}`);
console.log(`✅ مسحوب: ${total_fetched.toLocaleString()} (${((total_fetched / total_works) * 100).toFixed(1)}%)`);
console.log(`🎯 مكتمل: ${total_complete.toLocaleString()} (${((total_complete / total_fetched) * 100).toFixed(1)}% من المسحوب)`);
console.log(`🚫 مفلتر: ${total_filtered.toLocaleString()} (${((total_filtered / total_works) * 100).toFixed(1)}%)`);

console.log('\n' + '═'.repeat(80));

db.close();
