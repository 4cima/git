const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

console.log('\n🔍 فحص تكرار المسلسلات بـ tmdb_id سالب\n');
console.log('═'.repeat(70));

// أسماء عينة من الـ 45
const sampleNames = [
  'Castle', 
  'Eddsworld', 
  'The Return of Sherlock Holmes', 
  'Olivia', 
  'Queens'
];

console.log('\n1️⃣ فحص تكرار الأسماء:\n');

sampleNames.forEach(name => {
  const results = db.prepare(`
    SELECT id, tmdb_id, name_en, slug, created_at
    FROM tv_series
    WHERE name_en = ?
    ORDER BY tmdb_id
  `).all(name);
  
  console.log(`"${name}":`);
  if (results.length === 0) {
    console.log('   لا يوجد\n');
  } else {
    results.forEach(r => {
      console.log(`   tmdb=${r.tmdb_id}, id=${r.id}, slug="${r.slug}"`);
      console.log(`   created: ${r.created_at}`);
    });
    console.log();
  }
});

// فحص شامل لكل الـ 45
console.log('2️⃣ فحص شامل لكل الـ 45:\n');

const allNegative = db.prepare(`
  SELECT id, tmdb_id, name_en
  FROM tv_series
  WHERE tmdb_id < 0
  ORDER BY tmdb_id ASC
`).all();

console.log(`إجمالي: ${allNegative.length}\n`);

let duplicatesFound = 0;
let uniqueNames = 0;

allNegative.forEach(neg => {
  const positive = db.prepare(`
    SELECT id, tmdb_id, slug
    FROM tv_series
    WHERE name_en = ? AND tmdb_id > 0
    LIMIT 1
  `).get(neg.name_en);
  
  if (positive) {
    duplicatesFound++;
    console.log(`❌ تكرار: "${neg.name_en}"`);
    console.log(`   سالب: tmdb=${neg.tmdb_id}, id=${neg.id}`);
    console.log(`   موجب: tmdb=${positive.tmdb_id}, id=${positive.id}, slug="${positive.slug}"\n`);
  } else {
    uniqueNames++;
  }
});

console.log('═'.repeat(70));
console.log('\n📊 الملخص:\n');
console.log(`   إجمالي الـ negative: ${allNegative.length}`);
console.log(`   مكررة (موجودة بـ tmdb_id موجب): ${duplicatesFound}`);
console.log(`   فريدة (مش موجودة بـ tmdb_id موجب): ${uniqueNames}\n`);

if (duplicatesFound === allNegative.length) {
  console.log('   ✅ كل الـ 45 مكررة - يجب حذفهم جميعاً');
} else if (duplicatesFound === 0) {
  console.log('   ⚠️  كل الـ 45 فريدة - حالة خاصة');
} else {
  console.log(`   ⚠️  مزيج: ${duplicatesFound} مكررة، ${uniqueNames} فريدة`);
}

console.log('\n');

db.close();
