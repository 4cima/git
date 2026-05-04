const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

console.log('📊 تحليل الأعمال غير المكتملة:\n');

const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN backdrop_path IS NULL OR backdrop_path = '' THEN 1 ELSE 0 END) as no_backdrop,
    SUM(CASE WHEN release_date IS NULL OR release_date = '' THEN 1 ELSE 0 END) as no_release
  FROM movies 
  WHERE overview_en IS NOT NULL 
  AND is_filtered = 0 
  AND is_complete = 0
`).get();

console.log('🎬 الأفلام غير المكتملة:');
console.log(`   إجمالي: ${stats.total.toLocaleString()}`);
console.log(`   بدون backdrop: ${stats.no_backdrop.toLocaleString()} (${((stats.no_backdrop / stats.total) * 100).toFixed(1)}%)`);
console.log(`   بدون release_date: ${stats.no_release.toLocaleString()} (${((stats.no_release / stats.total) * 100).toFixed(1)}%)`);

console.log('\n✅ الخلاصة:');
console.log('   معظمها ناقص backdrop فقط');
console.log('   backdrop ليس شرط للاكتمال حسب الشروط الجديدة');
console.log('   يمكن تحديث is_complete لهذه الأعمال');

console.log('\n📊 ملخص المزامنة:');
const m_synced = db.prepare('SELECT COUNT(*) as c FROM movies WHERE synced_to_turso = 1').get();
const m_not_synced = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 1 AND is_filtered = 0 AND (synced_to_turso = 0 OR synced_to_turso IS NULL)').get();
const s_synced = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE synced_to_turso = 1').get();
const s_not_synced = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 1 AND is_filtered = 0 AND (synced_to_turso = 0 OR synced_to_turso IS NULL)').get();

console.log(`   🎬 أفلام مزامنة: ${m_synced.c.toLocaleString()}`);
console.log(`   🎬 أفلام غير مزامنة: ${m_not_synced.c.toLocaleString()}`);
console.log(`   📺 مسلسلات مزامنة: ${s_synced.c.toLocaleString()}`);
console.log(`   📺 مسلسلات غير مزامنة: ${s_not_synced.c.toLocaleString()}`);
console.log(`   📊 إجمالي غير مزامن: ${(m_not_synced.c + s_not_synced.c).toLocaleString()}`);

db.close();
