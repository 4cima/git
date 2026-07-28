require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص توافق ترجمة Fantasy في Turso\n');
console.log('═'.repeat(70));

async function main() {
  try {
    // Count movies with Fantasy translated as "خيال"
    const khayalResult = await turso.execute(`
      SELECT COUNT(*) as count 
      FROM movies 
      WHERE genres_json LIKE '%"name":"Fantasy"%' 
        AND genres_json LIKE '%"name_ar":"خيال"%'
    `);
    const khayalCount = khayalResult.rows[0].count;

    // Count movies with Fantasy translated as "فانتازيا"
    const fantasyResult = await turso.execute(`
      SELECT COUNT(*) as count 
      FROM movies 
      WHERE genres_json LIKE '%"name":"Fantasy"%' 
        AND genres_json LIKE '%"name_ar":"فانتازيا"%'
    `);
    const fantasyCount = fantasyResult.rows[0].count;

    // Total movies
    const totalResult = await turso.execute(`
      SELECT COUNT(*) as count FROM movies
    `);
    const totalMovies = totalResult.rows[0].count;

    console.log('📊 النتائج من Turso (cinma-db):');
    console.log('─'.repeat(70));
    console.log(`   إجمالي الأفلام: ${totalMovies.toLocaleString()}`);
    console.log(`   أفلام Fantasy → "خيال": ${khayalCount.toLocaleString()}`);
    console.log(`   أفلام Fantasy → "فانتازيا": ${fantasyCount.toLocaleString()}`);
    console.log('═'.repeat(70));

    // Sample with "خيال"
    if (khayalCount > 0) {
      console.log('\n🎬 عينة من أفلام Fantasy → "خيال":');
      console.log('─'.repeat(70));
      const khayalSamples = await turso.execute(`
        SELECT id, title_ar, title_en, genres_json 
        FROM movies 
        WHERE genres_json LIKE '%"name":"Fantasy"%' 
          AND genres_json LIKE '%"name_ar":"خيال"%'
        LIMIT 5
      `);
      
      khayalSamples.rows.forEach(movie => {
        console.log(`   [${movie.id}] ${movie.title_ar || movie.title_en}`);
        // Print just the Fantasy genre part
        try {
          const genres = JSON.parse(movie.genres_json);
          const fantasyGenre = genres.find(g => g.name === 'Fantasy');
          if (fantasyGenre) {
            console.log(`   Genre: ${JSON.stringify(fantasyGenre)}`);
          }
        } catch (e) {
          console.log(`   Raw: ${movie.genres_json}`);
        }
        console.log('');
      });
    }

    // Sample with "فانتازيا"
    if (fantasyCount > 0) {
      console.log('\n🎬 عينة من أفلام Fantasy → "فانتازيا":');
      console.log('─'.repeat(70));
      const fantasySamples = await turso.execute(`
        SELECT id, title_ar, title_en, genres_json 
        FROM movies 
        WHERE genres_json LIKE '%"name":"Fantasy"%' 
          AND genres_json LIKE '%"name_ar":"فانتازيا"%'
        LIMIT 5
      `);
      
      fantasySamples.rows.forEach(movie => {
        console.log(`   [${movie.id}] ${movie.title_ar || movie.title_en}`);
        try {
          const genres = JSON.parse(movie.genres_json);
          const fantasyGenre = genres.find(g => g.name === 'Fantasy');
          if (fantasyGenre) {
            console.log(`   Genre: ${JSON.stringify(fantasyGenre)}`);
          }
        } catch (e) {
          console.log(`   Raw: ${movie.genres_json}`);
        }
        console.log('');
      });
    }

    console.log('═'.repeat(70));
    if (khayalCount > 0 && fantasyCount === 0) {
      console.log('✅ كل الأفلام تستخدم "خيال" (متسق)');
    } else if (khayalCount === 0 && fantasyCount > 0) {
      console.log('✅ كل الأفلام تستخدم "فانتازيا" (متسق)');
    } else if (khayalCount > 0 && fantasyCount > 0) {
      console.log('❌ غير متسق: الاتنين موجودين في Turso');
      console.log(`   هذا يعني أن التزامن من local.db لـ Turso لا ينقل قيمة name_ar المحدثة`);
    } else {
      console.log('ℹ️  لا توجد أفلام Fantasy في Turso');
    }
    console.log('═'.repeat(70));

    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ:', e.message);
    process.exit(1);
  }
}

main();
