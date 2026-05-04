const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');

console.log('\n🔍 البيانات الفعلية الحالية');
console.log('التاريخ:', new Date().toLocaleString('ar-SA'));
console.log('═'.repeat(80));

const queries = [
  { label: '\n🎬 أفلام - إجمالي', sql: 'SELECT COUNT(*) as c FROM movies' },
  { label: '🎬 أفلام - مسحوب', sql: 'SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL' },
  { label: '🎬 أفلام - مكتمل', sql: 'SELECT COUNT(*) as c FROM movies WHERE is_complete = 1' },
  { label: '🎬 أفلام - مفلتر', sql: 'SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1' },
  { label: '🎬 أفلام - لم يُسحب ولم يُفلتر', sql: 'SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL AND is_filtered = 0' },
  { label: '🎬 أفلام - مفلتر بدون وصف', sql: "SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1 AND filter_reason = 'no_overview'" },
  { label: '🎬 أفلام - مفلتر بدون poster', sql: "SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1 AND filter_reason = 'no_poster'" },
  { label: '\n📺 مسلسلات - إجمالي', sql: 'SELECT COUNT(*) as c FROM tv_series' },
  { label: '📺 مسلسلات - مسحوب', sql: 'SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NOT NULL' },
  { label: '📺 مسلسلات - مكتمل', sql: 'SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 1' },
  { label: '📺 مسلسلات - مفلتر', sql: 'SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1' },
  { label: '📺 مسلسلات - لم يُسحب ولم يُفلتر', sql: 'SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NULL AND is_filtered = 0' },
  { label: '📺 مسلسلات - مفلتر بدون وصف', sql: "SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1 AND filter_reason = 'no_overview'" },
  { label: '📺 مسلسلات - مفلتر بدون poster', sql: "SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1 AND filter_reason = 'no_poster'" }
];

queries.forEach(q => {
  try {
    const result = db.prepare(q.sql).get();
    console.log(`${q.label}: ${result.c.toLocaleString()}`);
  } catch (e) {
    console.log(`${q.label}: خطأ - ${e.message}`);
  }
});

console.log('\n═'.repeat(80));
console.log('✅ تم بنجاح\n');
db.close();
