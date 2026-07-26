require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function restoreSlugs() {
  console.log('🔄 بدء استعادة Slugs من النسخة الاحتياطية\n');
  console.log('═'.repeat(70));
  
  // قائمة الملفات المتاحة
  const backupFiles = fs.readdirSync('.')
    .filter(f => f.startsWith('BACKUP-movies-slugs-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (backupFiles.length === 0) {
    console.log('❌ لا يوجد ملفات نسخ احتياطي');
    console.log('   (ابحث عن ملفات بصيغة: BACKUP-movies-slugs-*.json)');
    process.exit(1);
  }
  
  console.log(`\n📁 ملفات النسخ الاحتياطي المتاحة (${backupFiles.length}):\n`);
  backupFiles.forEach((f, i) => {
    const stat = fs.statSync(f);
    const size = (stat.size / 1024 / 1024).toFixed(2);
    const date = stat.mtime.toISOString().slice(0, 19).replace('T', ' ');
    console.log(`   ${i + 1}. ${f}`);
    console.log(`      ${size} MB | ${date}`);
  });
  
  // استخدام أحدث ملف
  const backupFile = backupFiles[0];
  console.log(`\n✅ سيتم استخدام: ${backupFile}\n`);
  
  // قراءة الملف
  console.log('📖 قراءة النسخة الاحتياطية...');
  
  let backup;
  try {
    const content = fs.readFileSync(backupFile, 'utf8');
    backup = JSON.parse(content);
  } catch (e) {
    console.log(`❌ خطأ في قراءة الملف: ${e.message}`);
    process.exit(1);
  }
  
  console.log(`   ✅ تم قراءة ${backup.movies.length.toLocaleString()} صف`);
  console.log(`   📅 تاريخ النسخة: ${backup.timestamp}`);
  
  // تأكيد
  console.log(`\n⚠️  تحذير: هذا سيستبدل كل الslugs الحالية في Turso!`);
  console.log(`   عدد الأفلام المتأثرة: ${backup.movies.length.toLocaleString()}`);
  console.log(`\n   للمتابعة، اضغط Ctrl+C للإلغاء، أو انتظر 5 ثواني...\n`);
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // بدء الاستعادة
  console.log('🔄 بدء الاستعادة...\n');
  
  let restored = 0;
  let failed = 0;
  const batchSize = 500;
  
  for (let i = 0; i < backup.movies.length; i += batchSize) {
    const batch = backup.movies.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(movie =>
        turso.execute({
          sql: 'UPDATE movies SET slug = ? WHERE tmdb_id = ?',
          args: [movie.slug, movie.tmdb_id]
        })
      )
    );
    
    results.forEach(r => {
      if (r.status === 'fulfilled') restored++;
      else failed++;
    });
    
    const progress = Math.min(i + batchSize, backup.movies.length);
    process.stdout.write(`\r   ⏳ ${progress.toLocaleString()}/${backup.movies.length.toLocaleString()}...`);
  }
  
  console.log(`\n\n✅ اكتملت الاستعادة:`);
  console.log(`   نجح: ${restored.toLocaleString()}`);
  console.log(`   فشل: ${failed.toLocaleString()}`);
  
  if (failed > 0) {
    console.log(`\n   ⚠️  بعض الأفلام لم يتم استعادتها - راجع الأخطاء`);
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('✅ اكتملت عملية الاستعادة');
  console.log('═'.repeat(70));
  
  process.exit(0);
}

restoreSlugs().catch(e => {
  console.error('\n❌ خطأ:', e.message);
  process.exit(1);
});
