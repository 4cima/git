const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

console.log('🔍 فحص فعلي مباشر على قاعدة البيانات\n');
console.log('التاريخ:', new Date().toLocaleString('ar-SA'));
console.log('═'.repeat(80));

// ═══════════════════════════════════════════════════════════════════════════════
// الأفلام
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n🎬 الأفلام:\n');

const m_total = db.prepare('SELECT COUNT(*) as c FROM movies').get();
console.log(`إجمالي IDs: ${m_total.c.toLocaleString()}`);

const m_fetched = db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND overview_en != ''").get();
console.log(`مسحوب (overview_en موجود): ${m_fetched.c.toLocaleString()}`);

const m_not_fetched = db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL OR overview_en = ''").get();
console.log(`لم يُسحب (overview_en فارغ): ${m_not_fetched.c.toLocaleString()}`);

const m_filtered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1').get();
console.log(`مفلتر: ${m_filtered.c.toLocaleString()}`);

const m_complete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 1').get();
console.log(`مكتمل: ${m_complete.c.toLocaleString()}`);

// ═══════════════════════════════════════════════════════════════════════════════
// المسلسلات
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n📺 المسلسلات:\n');

const s_total = db.prepare('SELECT COUNT(*) as c FROM tv_series').get();
console.log(`إجمالي IDs: ${s_total.c.toLocaleString()}`);

const s_fetched = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND overview_en != ''").get();
console.log(`مسحوب (overview_en موجود): ${s_fetched.c.toLocaleString()}`);

const s_not_fetched = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NULL OR overview_en = ''").get();
console.log(`لم يُسحب (overview_en فارغ): ${s_not_fetched.c.toLocaleString()}`);

const s_filtered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1').get();
console.log(`مفلتر: ${s_filtered.c.toLocaleString()}`);

const s_complete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 1').get();
console.log(`مكتمل: ${s_complete.c.toLocaleString()}`);

// ═══════════════════════════════════════════════════════════════════════════════
// جدول cast_crew
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n👥 جدول cast_crew:\n');

const cc_total = db.prepare('SELECT COUNT(*) as c FROM cast_crew').get();
console.log(`إجمالي السجلات: ${cc_total.c.toLocaleString()}`);

const cc_movie = db.prepare('SELECT COUNT(DISTINCT content_id) as c FROM cast_crew WHERE content_type = \'movie\'').get();
console.log(`أفلام لديها ممثلين (content_type = "movie"): ${cc_movie.c.toLocaleString()}`);

const cc_tv = db.prepare('SELECT COUNT(DISTINCT content_id) as c FROM cast_crew WHERE content_type = \'tv\'').get();
console.log(`مسلسلات لديها ممثلين (content_type = "tv"): ${cc_tv.c.toLocaleString()}`);

const cc_series = db.prepare('SELECT COUNT(DISTINCT content_id) as c FROM cast_crew WHERE content_type = \'series\'').get();
console.log(`مسلسلات لديها ممثلين (content_type = "series"): ${cc_series.c.toLocaleString()}`);

// فحص كل القيم الموجودة في content_type
const cc_types = db.prepare('SELECT DISTINCT content_type, COUNT(*) as c FROM cast_crew GROUP BY content_type').all();
console.log('\nجميع قيم content_type الموجودة:');
cc_types.forEach(t => console.log(`  ${t.content_type}: ${t.c.toLocaleString()} سجل`));

// ═══════════════════════════════════════════════════════════════════════════════
// الملخص
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('\n📊 الملخص:\n');

console.log(`إجمالي الأعمال: ${(m_total.c + s_total.c).toLocaleString()}`);
console.log(`مسحوب: ${(m_fetched.c + s_fetched.c).toLocaleString()}`);
console.log(`مكتمل: ${(m_complete.c + s_complete.c).toLocaleString()}`);
console.log(`مفلتر: ${(m_filtered.c + s_filtered.c).toLocaleString()}`);

console.log('\n' + '═'.repeat(80));

db.close();
