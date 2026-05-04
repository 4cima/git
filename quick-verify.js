const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

console.log('🔍 التحقق السريع\n');

try {
  // الأفلام
  const m1 = db.prepare(`SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL AND is_filtered = 0`).get();
  console.log(`🎬 أفلام لم تُسحب ولم تُفلتر: ${m1.c.toLocaleString()}`);
  
  const m2 = db.prepare(`SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1 AND filter_reason = 'no_overview'`).get();
  console.log(`🎬 أفلام مفلترة بدون وصف: ${m2.c.toLocaleString()}`);
  
  const m3 = db.prepare(`SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1 AND filter_reason = 'no_poster'`).get();
  console.log(`🎬 أفلام مفلترة بدون poster: ${m3.c.toLocaleString()}`);
  
  // المسلسلات
  const s1 = db.prepare(`SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NULL AND is_filtered = 0`).get();
  console.log(`\n📺 مسلسلات لم تُسحب ولم تُفلتر: ${s1.c.toLocaleString()}`);
  
  const s2 = db.prepare(`SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1 AND filter_reason = 'no_overview'`).get();
  console.log(`📺 مسلسلات مفلترة بدون وصف: ${s2.c.toLocaleString()}`);
  
  const s3 = db.prepare(`SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1 AND filter_reason = 'no_poster'`).get();
  console.log(`📺 مسلسلات مفلترة بدون poster: ${s3.c.toLocaleString()}`);
  
  console.log('\n✅ تم');
} catch (e) {
  console.error('❌ خطأ:', e.message);
} finally {
  db.close();
}
