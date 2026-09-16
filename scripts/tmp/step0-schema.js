const D = require('better-sqlite3');
const db = D('data/4cima-local.db', { readonly: true });
for (const t of ['movies','content_genres','genres']) {
  const r = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(t);
  console.log('=== ' + t + ' ===');
  console.log(r ? r.sql : 'MISSING');
}
console.log('=== pragma movies cols ===');
for (const c of db.prepare("SELECT name FROM pragma_table_info('movies')").all()) console.log(c.name);
db.close();
