import Database from 'better-sqlite3';

const db = new Database('./data/4cima-local.db');

console.log('\n🔍 فحص جدول ingestion_progress\n');

// عرض بنية الجدول
const schema = db.prepare('PRAGMA table_info(ingestion_progress)').all();

console.log('📊 أعمدة الجدول:');
schema.forEach(col => {
  console.log(`   - ${col.name} (${col.type})`);
});

console.log('\n📋 البيانات الحالية:');
const data = db.prepare('SELECT * FROM ingestion_progress').all();
data.forEach(row => {
  console.log(`\n   ${row.script_name}:`);
  Object.keys(row).forEach(key => {
    console.log(`      ${key}: ${row[key]}`);
  });
});

db.close();
