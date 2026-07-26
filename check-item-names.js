const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

const count = db.prepare(`SELECT COUNT(*) as cnt FROM tv_series WHERE name_en LIKE 'Item %'`).get();
console.log('عدد المسلسلات بـ "Item": ' + count.cnt);

const samples = db.prepare(`
  SELECT id, tmdb_id, name_en, name_ar 
  FROM tv_series 
  WHERE name_en LIKE 'Item %' 
  LIMIT 20
`).all();

console.log('\nأمثلة:\n');
samples.forEach(s => {
  console.log(`id=${s.id}, tmdb=${s.tmdb_id}`);
  console.log(`  name_en="${s.name_en}"`);
  console.log(`  name_ar="${s.name_ar}"`);
  console.log();
});

db.close();
