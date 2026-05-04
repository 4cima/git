const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true, timeout: 5000 });

console.log('🔍 البيانات الفعلية الحالية\n');
console.log('التاريخ:', new Date().toLocaleString('ar-SA'));
console.log('═'.repeat(80));

try {
  // الأفلام
  console.log('\n🎬 الأفلام:\n');
  
  const m_total = db.prepare('SELECT COUNT(*) as c FROM movies').get();
  console.log(`إجمالي: ${m_total.c.toLocaleString()}`);
  
  const m_fetched = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL').get();
  console.log(`مسحوب: ${m_fetched.c.toLocaleString()}`);
  
  const m_complete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 1').get();
  console.log(`مكتمل: ${m_complete.c.toLocaleString()}`);
  
  const m_filtered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1').get();
  console.log(`مفلتر: ${m_filtered.c.toLocaleString()}`);
  
  const m_not_fetched_not_filtered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL AND is_filtered = 0').get();
  console.log(`لم يُسحب ولم يُفلتر: ${m_not_fetched_not_filtered.c.toLocaleString()}`);
  
  const m_filtered_no_overview = db.prepare("SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1 AND filter_reason = 'no_overview'").get();
  console.log(`مفلتر بدون وصف: ${m_filtered_no_overview.c.toLocaleString()}`);
  
  const m_filtered_no_poster = db.prepare("SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1 AND filter_reason = 'no_poster'").get();
  console.log(`مفلتر بدون poster: ${m_filtered_no_poster.c.toLocaleString()}`);
  
  // المسلسلات
  console.log('\n📺 المسلسلات:\n');
  
  const s_total = db.prepare('SELECT COUNT(*) as c FROM tv_series').get();
  console.log(`إجمالي: ${s_total.c.toLocaleString()}`);
  
  const s_fetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NOT NULL').get();
  console.log(`مسحوب: ${s_fetched.c.toLocaleString()}`);
  
  const s_complete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 1').get();
  console.log(`مكتمل: ${s_complete.c.toLocaleString()}`);
  
  const s_filtered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1').get();
  console.log(`مفلتر: ${s_filtered.c.toLocaleString()}`);
  
  const s_not_fetched_not_filtered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NULL AND is_filtered = 0').get();
  console.log(`لم يُسحب ولم يُفلتر: ${s_not_fetched_not_filtered.c.toLocaleString()}`);
  
  const s_filtered_no_overview = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1 AND filter_reason = 'no_overview'").get();
  console.log(`مفلتر بدون وصف: ${s_filtered_no_overview.c.toLocaleString()}`);
  
  const s_filtered_no_poster = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1 AND filter_reason = 'no_poster'").get();
  console.log(`مفلتر بدون poster: ${s_filtered_no_poster.c.toLocaleString()}`);
  
  console.log('\n' + '═'.repeat(80));
  console.log('✅ تم بنجاح');
  
} catch (e) {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
} finally {
  db.close();
}
