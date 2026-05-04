const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');

console.log('\n🔍 تفاصيل الأعمال المفلترة');
console.log('═'.repeat(80));

try {
  const m_no_overview = db.prepare("SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1 AND filter_reason = 'no_overview'").get();
  console.log(`🎬 أفلام مفلترة بدون وصف: ${m_no_overview.c.toLocaleString()}`);
  
  const m_no_poster = db.prepare("SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1 AND filter_reason = 'no_poster'").get();
  console.log(`🎬 أفلام مفلترة بدون poster: ${m_no_poster.c.toLocaleString()}`);
  
  const s_no_overview = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1 AND filter_reason = 'no_overview'").get();
  console.log(`📺 مسلسلات مفلترة بدون وصف: ${s_no_overview.c.toLocaleString()}`);
  
  const s_no_poster = db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1 AND filter_reason = 'no_poster'").get();
  console.log(`📺 مسلسلات مفلترة بدون poster: ${s_no_poster.c.toLocaleString()}`);
  
  console.log('\n✅ تم');
} catch (e) {
  console.error('❌ خطأ:', e.message);
}

db.close();
