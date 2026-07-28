const db = require('./scripts/services/local-db');

console.log('🔍 فحص توافق ترجمة Fantasy في القاعدة المحلية\n');
console.log('═'.repeat(70));

// Get Fantasy genre ID
const fantasyGenre = db.prepare(`
  SELECT tmdb_id, name_en, name_ar FROM genres WHERE name_en = 'Fantasy'
`).get();

if (!fantasyGenre) {
  console.log('❌ Fantasy genre not found in genres table');
  process.exit(1);
}

console.log(`📌 Fantasy Genre Info:`);
console.log(`   TMDB ID: ${fantasyGenre.tmdb_id}`);
console.log(`   English: ${fantasyGenre.name_en}`);
console.log(`   Arabic: ${fantasyGenre.name_ar}`);
console.log('');

// Count movies with Fantasy genre via content_genres table
const movieCount = db.prepare(`
  SELECT COUNT(*) as count 
  FROM content_genres 
  WHERE genre_tmdb_id = ? AND content_type = 'movie'
`).get(fantasyGenre.tmdb_id).count;

// Count series with Fantasy genre
const seriesCount = db.prepare(`
  SELECT COUNT(*) as count 
  FROM content_genres 
  WHERE genre_tmdb_id = ? AND content_type = 'tv'
`).get(fantasyGenre.tmdb_id).count;

console.log('📊 النتائج من القاعدة المحلية (data/4cima-local.db):');
console.log('─'.repeat(70));
console.log(`   أفلام Fantasy (genre_tmdb_id = ${fantasyGenre.tmdb_id}): ${movieCount.toLocaleString()}`);
console.log(`   مسلسلات Fantasy (genre_tmdb_id = ${fantasyGenre.tmdb_id}): ${seriesCount.toLocaleString()}`);
console.log(`   الترجمة العربية المخزنة في genres table: "${fantasyGenre.name_ar}"`);
console.log('═'.repeat(70));

// Sample movies
if (movieCount > 0) {
  console.log('\n🎬 عينة من الأفلام:');
  const samples = db.prepare(`
    SELECT m.tmdb_id, m.title_ar, m.title_en
    FROM movies m
    INNER JOIN content_genres cg ON m.tmdb_id = cg.content_tmdb_id
    WHERE cg.genre_tmdb_id = ? AND cg.content_type = 'movie'
    LIMIT 5
  `).all(fantasyGenre.tmdb_id);
  
  samples.forEach(m => {
    console.log(`   [${m.tmdb_id}] ${m.title_ar || m.title_en}`);
  });
}

console.log('\n═'.repeat(70));
console.log('✅ النتيجة: القاعدة المحلية تستخدم "' + fantasyGenre.name_ar + '" لكل أفلام Fantasy');
console.log('═'.repeat(70));
