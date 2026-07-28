require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const DRY_RUN = process.argv.includes('--dry-run');

console.log('🔧 تصحيح ترجمة Fantasy في Turso\n');
console.log('═'.repeat(70));

async function main() {
  try {
    // Get all movies with Fantasy → "خيال"
    const result = await turso.execute(`
      SELECT id, title_ar, title_en, genres_json 
      FROM movies 
      WHERE genres_json LIKE '%"name":"Fantasy"%' 
        AND genres_json LIKE '%"name_ar":"خيال"%'
    `);

    const movies = result.rows;
    console.log(`📊 عدد الأفلام المطلوب تحديثها: ${movies.length}\n`);

    if (movies.length === 0) {
      console.log('✅ لا توجد أفلام تحتاج تحديث');
      process.exit(0);
    }

    // Show first 3 examples
    console.log('📋 عينة من التحديثات (أول 3 أفلام):\n');
    console.log('─'.repeat(70));

    for (let i = 0; i < Math.min(3, movies.length); i++) {
      const movie = movies[i];
      const oldGenresJson = movie.genres_json;
      
      // String replacement: exact match for Fantasy genre object
      const newGenresJson = oldGenresJson.replace(
        '"id":14,"name":"Fantasy","name_ar":"خيال"',
        '"id":14,"name":"Fantasy","name_ar":"فانتازيا"'
      );

      console.log(`[${movie.id}] ${movie.title_ar || movie.title_en}`);
      console.log('BEFORE:');
      console.log(oldGenresJson);
      console.log('\nAFTER:');
      console.log(newGenresJson);
      console.log('─'.repeat(70));
    }

    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN MODE - لم يتم تنفيذ أي تحديثات');
      console.log('لتنفيذ التحديثات الفعلية، شغل السكريبت بدون --dry-run flag');
      process.exit(0);
    }

    // Execute updates
    console.log(`\n🚀 بدء التحديث على ${movies.length} فيلم...\n`);

    let updated = 0;
    let failed = 0;

    for (const movie of movies) {
      try {
        const oldGenresJson = movie.genres_json;
        const newGenresJson = oldGenresJson.replace(
          '"id":14,"name":"Fantasy","name_ar":"خيال"',
          '"id":14,"name":"Fantasy","name_ar":"فانتازيا"'
        );

        // Verify the replacement happened
        if (oldGenresJson === newGenresJson) {
          console.log(`⚠️  [${movie.id}] لم يتم العثور على التطابق الدقيق`);
          failed++;
          continue;
        }

        await turso.execute({
          sql: 'UPDATE movies SET genres_json = ? WHERE id = ?',
          args: [newGenresJson, movie.id]
        });

        updated++;
        if (updated % 10 === 0) {
          console.log(`   ✅ تم تحديث ${updated}/${movies.length}`);
        }
      } catch (err) {
        console.error(`❌ [${movie.id}] خطأ:`, err.message);
        failed++;
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ اكتمل التحديث!');
    console.log(`   نجح: ${updated}`);
    console.log(`   فشل: ${failed}`);
    console.log('═'.repeat(70));

    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ فادح:', e.message);
    process.exit(1);
  }
}

main();
