require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function backupSlugs() {
  console.log('💾 بدء نسخ احتياطي لجميع Slugs من Turso\n');
  console.log('═'.repeat(70));
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `BACKUP-movies-slugs-${timestamp}.json`;
  
  console.log(`\n📁 اسم الملف: ${filename}\n`);
  
  // جلب كل الslugs بـchunks
  const allMovies = [];
  let offset = 0;
  const chunkSize = 10000;
  
  while (true) {
    console.log(`   جاري الجلب: offset=${offset}...`);
    
    const result = await turso.execute({
      sql: 'SELECT id, tmdb_id, slug FROM movies ORDER BY tmdb_id ASC LIMIT ? OFFSET ?',
      args: [chunkSize, offset]
    });
    
    if (result.rows.length === 0) break;
    
    result.rows.forEach(row => {
      allMovies.push({
        id: row.id,
        tmdb_id: row.tmdb_id,
        slug: row.slug
      });
    });
    
    offset += chunkSize;
    
    if (result.rows.length < chunkSize) break;
  }
  
  console.log(`\n   ✅ تم جلب ${allMovies.length.toLocaleString()} فيلم`);
  
  // حفظ الملف
  const backup = {
    timestamp: new Date().toISOString(),
    total: allMovies.length,
    movies: allMovies
  };
  
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2), 'utf8');
  
  const fileSize = (fs.statSync(filename).size / 1024 / 1024).toFixed(2);
  
  console.log(`\n💾 تم حفظ النسخة الاحتياطية:`);
  console.log(`   الملف: ${filename}`);
  console.log(`   الحجم: ${fileSize} MB`);
  console.log(`   الأفلام: ${allMovies.length.toLocaleString()}`);
  
  // فحص الملف
  console.log(`\n🔍 فحص صحة الملف...`);
  
  try {
    const content = fs.readFileSync(filename, 'utf8');
    const parsed = JSON.parse(content);
    
    if (parsed.movies.length === allMovies.length) {
      console.log(`   ✅ الملف صحيح - ${parsed.movies.length.toLocaleString()} صف`);
    } else {
      console.log(`   ⚠️  تحذير: عدم تطابق - متوقع ${allMovies.length}، موجود ${parsed.movies.length}`);
    }
    
    // عينة
    console.log(`\n📊 عينة من الملف (أول 5):`);
    parsed.movies.slice(0, 5).forEach(m => {
      console.log(`   [id=${m.id}, tmdb=${m.tmdb_id}] slug="${m.slug}"`);
    });
    
  } catch (e) {
    console.log(`   ❌ خطأ في قراءة الملف: ${e.message}`);
    process.exit(1);
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('✅ اكتملت النسخة الاحتياطية بنجاح');
  console.log('═'.repeat(70));
  
  process.exit(0);
}

backupSlugs().catch(e => {
  console.error('\n❌ خطأ:', e.message);
  process.exit(1);
});
