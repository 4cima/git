const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

const columns = db.prepare("PRAGMA table_info(tv_series)").all();
console.log('أعمدة جدول tv_series:\n');
columns.forEach(col => {
  if (col.name.includes('name') || col.name.includes('title')) {
    console.log(`${col.name} (${col.type})`);
  }
});

db.close();
