require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔧 إصلاح slugs القديمة في Turso\n');
console.log('═'.repeat(70));

function toSlug(text) {
  if (!text) return 'unknown';
  return text.toString().toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  try {
    console.log('\n📋 استراتيجية الإصلاح:');
    console.log('   - الصيغة الجديدة: title-tmdb_id');
    console.log('   - مثال: helen → helen-724606');
    console.log('   - هذا يضمن فرادة 100% حتى للأفلام بنفس الاسم\n');
    
    // جلب كل الأفلام من Turso
    console.log('⏳ جلب الأفلام من Turso...');
    const result = await turso.execute('SELECT id, tmdb_id, title_en, slug FROM movies');
    const movies = result.rows;
    
    console.log(`✅ تم جلب ${movies.length.toLocaleString()} فيلم\n`);
    
    // فحص كم فيلم محتاج تحديث
    let needsUpdate = 0;
    for (const movie of movies) {
      const expectedSlug = `${toSlug(movie.title_en)}-${movie.tmdb_id}`;
      if (movie.slug !== expectedSlug) {
        needsUpdate++;
      }
    }
    
    console.log(`📊 التحليل:`);
    console.log(`   - محتاج تحديث: ${needsUpdate.toLocaleString()}`);
    console.log(`   - صحيح بالفعل: ${(movies.length - needsUpdate).toLocaleString()}\n`);
    
    if (needsUpdate === 0) {
      console.log('✅ كل الـ slugs صحيحة!');
      process.exit(0);
    }
    
    console.log('🚀 بدء التحديث...\n');
    
    let updated = 0;
    let errors = 0;
    
    // تحديث بدفعات
    const BATCH_SIZE = 100;
    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (movie) => {
        const expectedSlug = `${toSlug(movie.title_en)}-${movie.tmdb_id}`;
        
        if (movie.slug !== expectedSlug) {
          try {
            await turso.execute({
              sql: 'UPDATE movies SET slug = ? WHERE id = ?',
              args: [expectedSlug, movie.id]
            });
            updated++;
          } catch (e) {
            console.error(`❌ خطأ في id=${movie.id}:`, e.message);
            errors++;
          }
        }
      }));
      
      if ((i + BATCH_SIZE) % 1000 === 0) {
        console.log(`   ⏳ ${Math.min(i + BATCH_SIZE, movies.length).toLocaleString()}/${movies.length.toLocaleString()} (${((i + BATCH_SIZE) / movies.length * 100).toFixed(1)}%)`);
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('📊 النتائج:');
    console.log(`   ✅ تم التحديث: ${updated.toLocaleString()}`);
    console.log(`   ❌ فشل: ${errors.toLocaleString()}`);
    console.log('═'.repeat(70));
    
    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ:', e.message);
    process.exit(1);
  }
}

main();
