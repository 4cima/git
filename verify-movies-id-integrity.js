const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

console.log('\n🔍 فحص تطابق id = tmdb_id للأفلام\n');
console.log('═'.repeat(70));

const mismatch = db.prepare(`
  SELECT COUNT(*) as cnt
  FROM movies
  WHERE id != tmdb_id
`).get();

console.log(`\nالأفلام بـ id != tmdb_id: ${mismatch.cnt.toLocaleString()}`);
console.log(`المتوقع: 0\n`);

if (mismatch.cnt === 0) {
  console.log('✅ التطابق سليم - يمكن المتابعة\n');
  process.exit(0);
} else {
  console.log('❌ فيه عدم تطابق - لازم نصلح قبل ما نكمل\n');
  
  // عينة من المشاكل
  const samples = db.prepare(`
    SELECT id, tmdb_id, title_en, slug
    FROM movies
    WHERE id != tmdb_id
    LIMIT 10
  `).all();
  
  console.log('عينة من المشاكل:\n');
  samples.forEach(s => {
    console.log(`  id=${s.id}, tmdb_id=${s.tmdb_id}`);
    console.log(`    title: "${s.title_en}"`);
    console.log(`    slug: ${s.slug}\n`);
  });
  
  process.exit(1);
}

db.close();
