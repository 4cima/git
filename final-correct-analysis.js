const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

console.log('🔍 التحليل الصحيح النهائي\n');
console.log('═'.repeat(100));

// ═══════════════════════════════════════════════════════════════════════════════
// الأفلام
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n🎬 الأفلام:\n');

const m_total = db.prepare('SELECT COUNT(*) as c FROM movies').get();
console.log(`📦 إجمالي IDs: ${m_total.c.toLocaleString()}`);

// 1. المسحوب = الذي لديه overview_en
const m_fetched = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL').get();
console.log(`✅ مسحوب (لديه overview_en): ${m_fetched.c.toLocaleString()} (${((m_fetched.c / m_total.c) * 100).toFixed(1)}%)`);

// 2. غير المسحوب = الذي ليس لديه overview_en
const m_not_fetched = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL').get();
console.log(`❌ لم يُسحب (ليس لديه overview_en): ${m_not_fetched.c.toLocaleString()} (${((m_not_fetched.c / m_total.c) * 100).toFixed(1)}%)`);

console.log(`\n🔢 التحقق: ${m_fetched.c} + ${m_not_fetched.c} = ${m_fetched.c + m_not_fetched.c} (يجب = ${m_total.c}) ✅`);

// 3. من المسحوب: كم مقبول وكم مفلتر؟
const m_accepted = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0').get();
const m_filtered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 1').get();

console.log(`\n📊 من المسحوب (${m_fetched.c.toLocaleString()}):`);
console.log(`   ✅ مقبول: ${m_accepted.c.toLocaleString()} (${((m_accepted.c / m_fetched.c) * 100).toFixed(1)}%)`);
console.log(`   🚫 مفلتر: ${m_filtered.c.toLocaleString()} (${((m_filtered.c / m_fetched.c) * 100).toFixed(1)}%)`);

// 4. من المقبول: كم مكتمل؟
const m_complete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 1').get();
const m_incomplete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0').get();

console.log(`\n📊 من المقبول (${m_accepted.c.toLocaleString()}):`);
console.log(`   ✅ مكتمل: ${m_complete.c.toLocaleString()} (${((m_complete.c / m_accepted.c) * 100).toFixed(1)}%)`);
console.log(`   ⚠️  غير مكتمل: ${m_incomplete.c.toLocaleString()} (${((m_incomplete.c / m_accepted.c) * 100).toFixed(1)}%)`);

// 5. تفاصيل الفلاتر
console.log(`\n🚫 تفاصيل الفلاتر (${m_filtered.c.toLocaleString()} عمل مفلتر):\n`);

const m_filter_details = db.prepare(`
  SELECT filter_reason, COUNT(*) as count 
  FROM movies 
  WHERE overview_en IS NOT NULL AND is_filtered = 1 
  GROUP BY filter_reason 
  ORDER BY count DESC
`).all();

m_filter_details.forEach(f => {
  const pct = ((f.count / m_filtered.c) * 100).toFixed(1);
  console.log(`   ${f.filter_reason || 'NULL'}: ${f.count.toLocaleString()} (${pct}%)`);
});

// 6. تفاصيل غير المكتمل - ما الذي ينقصه؟
console.log(`\n⚠️  تفاصيل غير المكتمل (${m_incomplete.c.toLocaleString()} عمل):\n`);

const m_missing_title_ar = db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (title_ar IS NULL OR title_ar = '')").get();
const m_missing_overview_ar = db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (overview_ar IS NULL OR overview_ar = '')").get();
const m_missing_poster = db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (poster_path IS NULL OR poster_path = '')").get();
const m_missing_backdrop = db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (backdrop_path IS NULL OR backdrop_path = '')").get();
const m_missing_release = db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (release_date IS NULL OR release_date = '')").get();

console.log(`   بدون title_ar: ${m_missing_title_ar.c.toLocaleString()}`);
console.log(`   بدون overview_ar: ${m_missing_overview_ar.c.toLocaleString()}`);
console.log(`   بدون poster_path: ${m_missing_poster.c.toLocaleString()}`);
console.log(`   بدون backdrop_path: ${m_missing_backdrop.c.toLocaleString()}`);
console.log(`   بدون release_date: ${m_missing_release.c.toLocaleString()}`);

// 7. تحليل متعدد المشاكل
console.log(`\n🔍 تحليل الأعمال متعددة المشاكل:\n`);

const m_multi = db.prepare(`
  SELECT 
    CASE WHEN title_ar IS NULL OR title_ar = '' THEN 1 ELSE 0 END +
    CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 ELSE 0 END +
    CASE WHEN poster_path IS NULL OR poster_path = '' THEN 1 ELSE 0 END +
    CASE WHEN backdrop_path IS NULL OR backdrop_path = '' THEN 1 ELSE 0 END +
    CASE WHEN release_date IS NULL OR release_date = '' THEN 1 ELSE 0 END as problems,
    COUNT(*) as count
  FROM movies 
  WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0
  GROUP BY problems
  ORDER BY problems DESC
`).all();

m_multi.forEach(m => {
  console.log(`   ${m.problems} مشكلة: ${m.count.toLocaleString()} عمل`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// المسلسلات
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n\n📺 المسلسلات:\n');

const s_total = db.prepare('SELECT COUNT(*) as c FROM tv_series').get();
console.log(`📦 إجمالي IDs: ${s_total.c.toLocaleString()}`);

// 1. المسحوب = الذي لديه overview_en
const s_fetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL').get();
console.log(`✅ مسحوب (لديه overview_en): ${s_fetched.c.toLocaleString()} (${((s_fetched.c / s_total.c) * 100).toFixed(1)}%)`);

// 2. غير المسحوب = الذي ليس لديه overview_en
const s_not_fetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NULL').get();
console.log(`❌ لم يُسحب (ليس لديه overview_en): ${s_not_fetched.c.toLocaleString()} (${((s_not_fetched.c / s_total.c) * 100).toFixed(1)}%)`);

console.log(`\n🔢 التحقق: ${s_fetched.c} + ${s_not_fetched.c} = ${s_fetched.c + s_not_fetched.c} (يجب = ${s_total.c}) ✅`);

// 3. من المسحوب: كم مقبول وكم مفلتر؟
const s_accepted = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0').get();
const s_filtered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 1').get();

console.log(`\n📊 من المسحوب (${s_fetched.c.toLocaleString()}):`);
console.log(`   ✅ مقبول: ${s_accepted.c.toLocaleString()} (${((s_accepted.c / s_fetched.c) * 100).toFixed(1)}%)`);
console.log(`   🚫 مفلتر: ${s_filtered.c.toLocaleString()} (${((s_filtered.c / s_fetched.c) * 100).toFixed(1)}%)`);

// 4. من المقبول: كم مكتمل؟
const s_complete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 1').get();
const s_incomplete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0').get();

console.log(`\n📊 من المقبول (${s_accepted.c.toLocaleString()}):`);
console.log(`   ✅ مكتمل: ${s_complete.c.toLocaleString()} (${((s_complete.c / s_accepted.c) * 100).toFixed(1)}%)`);
console.log(`   ⚠️  غير مكتمل: ${s_incomplete.c.toLocaleString()} (${((s_incomplete.c / s_accepted.c) * 100).toFixed(1)}%)`);

// 5. تفاصيل الفلاتر
console.log(`\n🚫 تفاصيل الفلاتر (${s_filtered.c.toLocaleString()} عمل مفلتر):\n`);

const s_filter_details = db.prepare(`
  SELECT filter_reason, COUNT(*) as count 
  FROM tv_series 
  WHERE overview_en IS NOT NULL AND is_filtered = 1 
  GROUP BY filter_reason 
  ORDER BY count DESC
`).all();

s_filter_details.forEach(f => {
  const pct = ((f.count / s_filtered.c) * 100).toFixed(1);
  console.log(`   ${f.filter_reason || 'NULL'}: ${f.count.toLocaleString()} (${pct}%)`);
});

// 6. تفاصيل غير المكتمل
console.log(`\n⚠️  تفاصيل غير المكتمل (${s_incomplete.c.toLocaleString()} عمل):\n`);

const s_missing_title_ar = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (title_ar IS NULL OR title_ar = '')").get();
const s_missing_overview_ar = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (overview_ar IS NULL OR overview_ar = '')").get();
const s_missing_poster = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (poster_path IS NULL OR poster_path = '')").get();
const s_missing_backdrop = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (backdrop_path IS NULL OR backdrop_path = '')").get();
const s_missing_first_air = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (first_air_date IS NULL OR first_air_date = '')").get();

console.log(`   بدون title_ar: ${s_missing_title_ar.c.toLocaleString()}`);
console.log(`   بدون overview_ar: ${s_missing_overview_ar.c.toLocaleString()}`);
console.log(`   بدون poster_path: ${s_missing_poster.c.toLocaleString()}`);
console.log(`   بدون backdrop_path: ${s_missing_backdrop.c.toLocaleString()}`);
console.log(`   بدون first_air_date: ${s_missing_first_air.c.toLocaleString()}`);

// 7. تحليل متعدد المشاكل
console.log(`\n🔍 تحليل الأعمال متعددة المشاكل:\n`);

const s_multi = db.prepare(`
  SELECT 
    CASE WHEN title_ar IS NULL OR title_ar = '' THEN 1 ELSE 0 END +
    CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 ELSE 0 END +
    CASE WHEN poster_path IS NULL OR poster_path = '' THEN 1 ELSE 0 END +
    CASE WHEN backdrop_path IS NULL OR backdrop_path = '' THEN 1 ELSE 0 END +
    CASE WHEN first_air_date IS NULL OR first_air_date = '' THEN 1 ELSE 0 END as problems,
    COUNT(*) as count
  FROM tv_series 
  WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0
  GROUP BY problems
  ORDER BY problems DESC
`).all();

s_multi.forEach(s => {
  console.log(`   ${s.problems} مشكلة: ${s.count.toLocaleString()} عمل`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// الملخص النهائي
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n\n📊 الملخص النهائي:\n');
console.log('═'.repeat(100));

console.log(`\n📦 إجمالي الأعمال: ${(m_total.c + s_total.c).toLocaleString()}`);
console.log(`✅ مسحوب: ${(m_fetched.c + s_fetched.c).toLocaleString()} (${(((m_fetched.c + s_fetched.c) / (m_total.c + s_total.c)) * 100).toFixed(1)}%)`);
console.log(`   ✅ مقبول: ${(m_accepted.c + s_accepted.c).toLocaleString()}`);
console.log(`   🚫 مفلتر: ${(m_filtered.c + s_filtered.c).toLocaleString()}`);
console.log(`🎯 مكتمل: ${(m_complete.c + s_complete.c).toLocaleString()} (${(((m_complete.c + s_complete.c) / (m_accepted.c + s_accepted.c)) * 100).toFixed(1)}% من المقبول)`);

console.log('\n' + '═'.repeat(100));

db.close();
