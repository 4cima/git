const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

console.log('🔍 تحليل الـ 179K placeholder data\n');
console.log('═'.repeat(70));

// السؤال 1: هل في انتظار السحب؟
console.log('\n1️⃣ حالة is_complete للـ placeholder:\n');
const completeStatus = db.prepare(`
  SELECT is_complete, COUNT(*) as cnt 
  FROM tv_series 
  WHERE name_en LIKE 'Item %' 
  GROUP BY is_complete
`).all();

completeStatus.forEach(row => {
  console.log(`   is_complete=${row.is_complete}: ${row.cnt.toLocaleString()} مسلسل`);
});

console.log('\n   هل اتزامنوا لـ Turso؟');
const synced = db.prepare(`
  SELECT COUNT(*) as cnt 
  FROM tv_series 
  WHERE name_en LIKE 'Item %' AND synced_to_turso = 1
`).get();
console.log(`   synced_to_turso=1: ${synced.cnt.toLocaleString()} مسلسل`);

// السؤال 2: عدد المسلسلات الحقيقية
console.log('\n2️⃣ عدد المسلسلات الحقيقية (غير placeholder):\n');
const realSeries = db.prepare(`
  SELECT COUNT(*) as cnt 
  FROM tv_series 
  WHERE name_en NOT LIKE 'Item %'
`).get();
console.log(`   المسلسلات الحقيقية: ${realSeries.cnt.toLocaleString()}`);
console.log(`   الـ backup السابق كان: 44,620`);
console.log(`   الفرق: ${realSeries.cnt - 44620} مسلسل`);

// تفاصيل إضافية
console.log('\n3️⃣ توزيع الحالات للمسلسلات الحقيقية:\n');
const realStatus = db.prepare(`
  SELECT is_complete, synced_to_turso, COUNT(*) as cnt
  FROM tv_series 
  WHERE name_en NOT LIKE 'Item %'
  GROUP BY is_complete, synced_to_turso
`).all();

realStatus.forEach(row => {
  console.log(`   is_complete=${row.is_complete}, synced=${row.synced_to_turso}: ${row.cnt.toLocaleString()}`);
});

// عينات من الـ placeholder
console.log('\n4️⃣ عينة من الـ placeholder لفهم الصورة:\n');
const placeholderSamples = db.prepare(`
  SELECT id, tmdb_id, name_en, is_complete, synced_to_turso, created_at
  FROM tv_series 
  WHERE name_en LIKE 'Item %'
  ORDER BY id ASC
  LIMIT 10
`).all();

placeholderSamples.forEach(s => {
  console.log(`   id=${s.id}, tmdb=${s.tmdb_id}, complete=${s.is_complete}, synced=${s.synced_to_turso}`);
});

console.log('\n═'.repeat(70));
console.log('\n📊 الملخص:');
console.log(`   - إجمالي المسلسلات: ${(179495 + realSeries.cnt).toLocaleString()}`);
console.log(`   - Placeholder (Item X): 179,495`);
console.log(`   - حقيقية: ${realSeries.cnt.toLocaleString()}`);

db.close();
