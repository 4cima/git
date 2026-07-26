const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

console.log('🔍 فحص مصدر الـ 179K placeholder\n');
console.log('═'.repeat(70));

// 1. فحص fetched_from و source
console.log('\n1️⃣ فحص fetched_from:\n');
const fetchedFrom = db.prepare(`
  SELECT fetched_from, COUNT(*) as cnt
  FROM tv_series 
  WHERE name_en LIKE 'Item %'
  GROUP BY fetched_from
`).all();

fetchedFrom.forEach(row => {
  console.log(`   fetched_from="${row.fetched_from}": ${row.cnt.toLocaleString()}`);
});

console.log('\nفحص source:\n');
const source = db.prepare(`
  SELECT source, COUNT(*) as cnt
  FROM tv_series 
  WHERE name_en LIKE 'Item %'
  GROUP BY source
`).all();

source.forEach(row => {
  console.log(`   source="${row.source}": ${row.cnt.toLocaleString()}`);
});

// 3. فحص tmdb_id ranges
console.log('\n3️⃣ نطاق tmdb_id:\n');

console.log('Placeholder (Item X):');
const placeholderRange = db.prepare(`
  SELECT 
    MIN(tmdb_id) as min_id, 
    MAX(tmdb_id) as max_id, 
    COUNT(DISTINCT tmdb_id) as unique_count,
    COUNT(*) as total_count
  FROM tv_series 
  WHERE name_en LIKE 'Item %'
`).get();

console.log(`   MIN: ${placeholderRange.min_id.toLocaleString()}`);
console.log(`   MAX: ${placeholderRange.max_id.toLocaleString()}`);
console.log(`   Unique IDs: ${placeholderRange.unique_count.toLocaleString()}`);
console.log(`   Total rows: ${placeholderRange.total_count.toLocaleString()}`);
console.log(`   Duplicates: ${(placeholderRange.total_count - placeholderRange.unique_count).toLocaleString()}\n`);

console.log('المسلسلات الحقيقية:');
const realRange = db.prepare(`
  SELECT 
    MIN(tmdb_id) as min_id, 
    MAX(tmdb_id) as max_id, 
    COUNT(DISTINCT tmdb_id) as unique_count
  FROM tv_series 
  WHERE name_en NOT LIKE 'Item %'
`).get();

console.log(`   MIN: ${realRange.min_id.toLocaleString()}`);
console.log(`   MAX: ${realRange.max_id.toLocaleString()}`);
console.log(`   Unique IDs: ${realRange.unique_count.toLocaleString()}\n`);

// فحص التداخل
console.log('التداخل بين placeholder والحقيقية:');
const overlap = db.prepare(`
  SELECT COUNT(*) as cnt
  FROM (
    SELECT tmdb_id FROM tv_series WHERE name_en LIKE 'Item %'
    INTERSECT
    SELECT tmdb_id FROM tv_series WHERE name_en NOT LIKE 'Item %'
  )
`).get();

console.log(`   تكرار tmdb_id: ${overlap.cnt.toLocaleString()}\n`);

// توزيع عينة من tmdb_id
console.log('عينة من أول 20 tmdb_id للـ placeholder:');
const sampleIds = db.prepare(`
  SELECT tmdb_id, id, name_en
  FROM tv_series 
  WHERE name_en LIKE 'Item %'
  ORDER BY id ASC
  LIMIT 20
`).all();

console.log('   ' + sampleIds.map(s => s.tmdb_id).join(', '));

console.log('\n═'.repeat(70));

db.close();
