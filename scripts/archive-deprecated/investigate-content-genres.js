const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

console.log('=== 1. هل content_genres موجود في local.db؟ ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='content_genres'").all();
console.log('content_genres في Local:', tables.length > 0 ? 'موجود' : 'غير موجود');

if (tables.length > 0) {
  const count = db.prepare('SELECT COUNT(*) as total FROM content_genres').get();
  console.log('عدد الصفوف:', count.total);
  console.log('\nعينة من البيانات (أول 3 صفوف):');
  console.log(JSON.stringify(db.prepare('SELECT * FROM content_genres LIMIT 3').all(), null, 2));
  
  console.log('\nهيكل جدول content_genres:');
  console.log(JSON.stringify(db.prepare('PRAGMA table_info(content_genres)').all(), null, 2));
}

console.log('\n=== 2. هل genres.id موجود ومختلف عن tmdb_id؟ ===');
console.log('هيكل جدول genres:');
console.log(JSON.stringify(db.prepare('PRAGMA table_info(genres)').all(), null, 2));

console.log('\n=== 3. عينة من genres للمقارنة ===');
console.log(JSON.stringify(db.prepare('SELECT * FROM genres LIMIT 3').all(), null, 2));

db.close();
console.log('\n✅ تم الانتهاء من التحقيق');
