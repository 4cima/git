require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص حالة UPDATE\n');

turso.execute('SELECT COUNT(*) as count FROM movies WHERE id != tmdb_id').then(result => {
  const remaining = result.rows[0].count;
  
  console.log(`📊 الصفوف المتبقية (id != tmdb_id): ${remaining.toLocaleString()}`);
  
  if (remaining === 0) {
    console.log('\n🎉 UPDATE اكتمل بنجاح!');
    console.log('✅ كل الأفلام الآن لديها id = tmdb_id');
  } else {
    const completed = 128319 - remaining;
    const progress = (completed / 128319 * 100).toFixed(1);
    console.log(`\n⏳ UPDATE لا يزال يعمل...`);
    console.log(`   تم: ${completed.toLocaleString()} (${progress}%)`);
    console.log(`   متبقي: ${remaining.toLocaleString()}`);
  }
  
  process.exit(0);
}).catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
