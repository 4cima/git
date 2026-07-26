const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

console.log('🔍 فحص أصل الـ placeholder data\n');
console.log('═'.repeat(70));

// 1. فحص created_at
console.log('\n1️⃣ تواريخ الإنشاء:\n');

console.log('Placeholder (Item X):');
const placeholderDates = db.prepare(`
  SELECT MIN(created_at) as min_date, MAX(created_at) as max_date, COUNT(*) as cnt
  FROM tv_series 
  WHERE name_en LIKE 'Item %'
`).get();
console.log(`   MIN: ${placeholderDates.min_date}`);
console.log(`   MAX: ${placeholderDates.max_date}`);
console.log(`   COUNT: ${placeholderDates.cnt.toLocaleString()}\n`);

console.log('المسلسلات الحقيقية:');
const realDates = db.prepare(`
  SELECT MIN(created_at) as min_date, MAX(created_at) as max_date, COUNT(*) as cnt
  FROM tv_series 
  WHERE name_en NOT LIKE 'Item %'
`).get();
console.log(`   MIN: ${realDates.min_date}`);
console.log(`   MAX: ${realDates.max_date}`);
console.log(`   COUNT: ${realDates.cnt.toLocaleString()}\n`);

// توزيع زمني أكثر تفصيلاً
console.log('توزيع زمني للـ placeholder (أول 10 دفعات):');
const placeholderDistribution = db.prepare(`
  SELECT created_at, COUNT(*) as cnt
  FROM tv_series 
  WHERE name_en LIKE 'Item %'
  GROUP BY created_at
  ORDER BY created_at ASC
  LIMIT 10
`).all();
placeholderDistribution.forEach(row => {
  console.log(`   ${row.created_at}: ${row.cnt.toLocaleString()} صف`);
});

// 3. فحص Schema
console.log('\n3️⃣ أعمدة جدول tv_series:\n');
const columns = db.prepare(`PRAGMA table_info(tv_series)`).all();
columns.forEach(col => {
  console.log(`   ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.dflt_value ? ', DEFAULT ' + col.dflt_value : ''})`);
});

console.log('\n═'.repeat(70));

db.close();
