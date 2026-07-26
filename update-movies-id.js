require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔧 تنفيذ UPDATE movies SET id = tmdb_id\n');
console.log('═'.repeat(70));

async function main() {
  try {
    console.log('\n⚠️  هذا UPDATE على قاعدة الإنتاج (Turso)');
    console.log('📋 الأمر: UPDATE movies SET id = tmdb_id WHERE id != tmdb_id\n');
    console.log('🎯 المتوقع: تحديث 128,319 صف\n');
    
    // التحقق قبل التنفيذ
    const checkBefore = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE id != tmdb_id');
    const countBefore = checkBefore.rows[0].count;
    
    console.log(`📊 عدد الصفوف قبل التحديث: ${countBefore.toLocaleString()}`);
    
    if (countBefore === 0) {
      console.log('\n✅ لا توجد صفوف محتاجة تحديث!');
      process.exit(0);
    }
    
    console.log('\n⏳ جاري التنفيذ...\n');
    
    const startTime = Date.now();
    
    // تنفيذ UPDATE
    const result = await turso.execute('UPDATE movies SET id = tmdb_id WHERE id != tmdb_id');
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // التحقق بعد التنفيذ
    const checkAfter = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE id != tmdb_id');
    const countAfter = checkAfter.rows[0].count;
    
    console.log('═'.repeat(70));
    console.log('✅ UPDATE اكتمل!\n');
    console.log('📊 النتائج:');
    console.log(`   قبل: ${countBefore.toLocaleString()} صف حيث id != tmdb_id`);
    console.log(`   بعد: ${countAfter.toLocaleString()} صف حيث id != tmdb_id`);
    console.log(`   تم التحديث: ${(countBefore - countAfter).toLocaleString()} صف`);
    console.log(`   ⏱️  الوقت: ${elapsed} ثانية`);
    
    if (countAfter === 0) {
      console.log('\n🎉 كل الأفلام الآن لديها id = tmdb_id!');
    }
    
    console.log('═'.repeat(70));
    
    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ في UPDATE:', e.message);
    process.exit(1);
  }
}

main();
