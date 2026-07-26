const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

console.log('🔍 فحص التكرارات والتطابق\n');
console.log('═'.repeat(70));

// 1. tmdb_id مكرر في المحلي؟
console.log('\n1️⃣ tmdb_id مكرر في المحلي (أول 20):\n');
const duplicates = db.prepare(`
  SELECT tmdb_id, COUNT(*) as cnt
  FROM movies
  GROUP BY tmdb_id
  HAVING cnt > 1
  ORDER BY cnt DESC
  LIMIT 20
`).all();

if (duplicates.length === 0) {
  console.log('   ✅ لا يوجد تكرار - كل tmdb_id فريد');
} else {
  console.log(`   ⚠️  إجمالي tmdb_ids المكررة: ${duplicates.length}\n`);
  duplicates.forEach(d => {
    console.log(`   tmdb_id=${d.tmdb_id}: ${d.cnt} نسخة`);
    
    // تفاصيل كل نسخة
    const versions = db.prepare(`
      SELECT id, tmdb_id, slug, title_en, updated_at, 
             CASE WHEN id = tmdb_id THEN 'نضيف' ELSE 'عشوائي' END as type
      FROM movies
      WHERE tmdb_id = ?
      ORDER BY updated_at DESC
    `).all(d.tmdb_id);
    
    versions.forEach(v => {
      console.log(`      id=${v.id} (${v.type}) | slug="${v.slug}" | updated=${v.updated_at || 'N/A'}`);
    });
    console.log();
  });
}

// 2. إحصائية شاملة
console.log('\n2️⃣ إحصائية المحلي:\n');

const totalLocal = db.prepare('SELECT COUNT(*) as c FROM movies').get();
console.log(`   إجمالي الصفوف: ${totalLocal.c.toLocaleString()}`);

const cleanIds = db.prepare('SELECT COUNT(*) as c FROM movies WHERE id = tmdb_id').get();
console.log(`   id = tmdb_id: ${cleanIds.c.toLocaleString()}`);

const dirtyIds = db.prepare('SELECT COUNT(*) as c FROM movies WHERE id != tmdb_id').get();
console.log(`   id != tmdb_id: ${dirtyIds.c.toLocaleString()}`);

const uniqueTmdb = db.prepare('SELECT COUNT(DISTINCT tmdb_id) as c FROM movies').get();
console.log(`   tmdb_ids فريدة: ${uniqueTmdb.c.toLocaleString()}`);

// 3. نسبة تعبئة primary_genre
console.log('\n3️⃣ نسبة تعبئة primary_genre في المحلي:\n');

const withGenre = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE primary_genre IS NOT NULL AND primary_genre != ''
`).get();

const genrePercent = (withGenre.c / totalLocal.c * 100).toFixed(2);
console.log(`   primary_genre موجود: ${withGenre.c.toLocaleString()} (${genrePercent}%)`);

// 4. عينة من الأفلام بدون genre
console.log('\n4️⃣ عينة من أفلام بدون primary_genre (أول 10):\n');
const noGenre = db.prepare(`
  SELECT tmdb_id, title_en, release_year, primary_genre
  FROM movies
  WHERE primary_genre IS NULL OR primary_genre = ''
  LIMIT 10
`).all();

noGenre.forEach(m => {
  console.log(`   [${m.tmdb_id}] "${m.title_en}" (${m.release_year || 'N/A'})`);
});

console.log('\n' + '═'.repeat(70));

db.close();
