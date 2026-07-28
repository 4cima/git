require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص genres في Turso\n');
console.log('═'.repeat(70));

async function main() {
  try {
    // Get all genres from Turso
    const result = await turso.execute(`
      SELECT * FROM genres ORDER BY name_en
    `);

    const genres = result.rows;
    
    console.log(`📊 إجمالي الـgenres في جدول genres (Turso): ${genres.length}\n`);
    console.log('─'.repeat(70));
    
    if (genres.length === 0) {
      console.log('⚠️  لا توجد genres في Turso!');
    } else {
      console.log('القائمة الكاملة:\n');
      genres.forEach((genre, index) => {
        console.log(`${index + 1}. [ID: ${genre.id}] ${genre.name_en} → ${genre.name_ar} (slug: ${genre.slug})`);
      });
    }
    
    console.log('\n' + '═'.repeat(70));
    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ:', e.message);
    process.exit(1);
  }
}

main();
