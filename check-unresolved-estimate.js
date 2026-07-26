const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

console.log('📊 تقدير عدد الـ unresolved المتوقع\n');
console.log('═'.repeat(60));

// 1. عناوين فاضية أو NULL
const empty = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE id = tmdb_id AND (title_en IS NULL OR title_en = '')
`).get();
console.log(`\n1️⃣ عناوين فاضية أو NULL: ${empty.c.toLocaleString()}`);

// 2. عناوين شائعة جداً (>10 تكرار)
const duplicates = db.prepare(`
  SELECT title_en, COUNT(*) as cnt 
  FROM movies 
  WHERE id = tmdb_id
  GROUP BY title_en 
  HAVING cnt > 10
  ORDER BY cnt DESC
  LIMIT 10
`).all();
console.log(`\n2️⃣ أكثر 10 عناوين مكررة:`);
duplicates.forEach(d => {
  console.log(`   ${d.title_en}: ${d.cnt} مرة`);
});

// 3. عناوين قصيرة جداً (<= 3 أحرف)
const short = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE id = tmdb_id AND LENGTH(title_en) <= 3
`).get();
console.log(`\n3️⃣ عناوين قصيرة (<=3 أحرف): ${short.c.toLocaleString()}`);

// 4. عناوين غير لاتينية (عربي/صيني/كوري/إلخ)
const nonLatin = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE id = tmdb_id 
  AND (
    title_en GLOB '*[؀-ۿ]*'  -- عربي
    OR title_en GLOB '*[一-龯]*'  -- صيني
    OR title_en GLOB '*[가-힣]*'  -- كوري
  )
`).get();
console.log(`\n4️⃣ عناوين غير لاتينية: ${nonLatin.c.toLocaleString()}`);

// 5. عينة من العناوين المشبوهة
console.log(`\n5️⃣ عينة عناوين مشبوهة (قصيرة جداً أو رموز):`);
const suspicious = db.prepare(`
  SELECT id, tmdb_id, title_en, release_year
  FROM movies 
  WHERE id = tmdb_id 
  AND (LENGTH(title_en) <= 2 OR title_en LIKE '%-%-%-%')
  LIMIT 10
`).all();
suspicious.forEach(m => {
  console.log(`   [${m.tmdb_id}] "${m.title_en}" (${m.release_year || 'N/A'})`);
});

console.log('\n' + '═'.repeat(60));
console.log('📊 التقدير: unresolved المتوقع < 100 فيلم (من 134,252)');
console.log('═'.repeat(60));

db.close();
