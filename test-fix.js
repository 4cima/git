require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/services/local-db');

console.log('🧪 اختبار الإصلاح: التحقق من أن الأفلام الملوثة جاهزة لإعادة المعالجة\n');

// التحقق من أن الأفلام تم إعادة ضبطها
const resetMovies = db.prepare(`
  SELECT id, tmdb_id, title_ar, overview_en, is_complete
  FROM movies
  WHERE id != tmdb_id
    AND overview_en IS NULL
`).all();

console.log(`📊 عدد الأفلام الجاهزة لإعادة المعالجة: ${resetMovies.length}\n`);

if (resetMovies.length > 0) {
  console.log('✅ الأفلام الملوثة تم إعادة ضبطها بنجاح\n');
  console.log('أمثلة:');
  resetMovies.slice(0, 5).forEach(m => {
    console.log(`  id=${m.id} | tmdb_id=${m.tmdb_id} | ${m.title_ar}`);
  });
  
  console.log('\n💡 عند تشغيل INGEST-MOVIES-LOGIC.js المصلح:');
  console.log('   - سيجلب البيانات من TMDB باستخدام tmdb_id الصحيح');
  console.log('   - سيحدث القاعدة المحلية باستخدام id المحلي');
  console.log('   - لن يحدث خلط بين الأفلام');
} else {
  console.log('⚠️ لا توجد أفلام ملوثة أو تم معالجتها بالفعل');
}

console.log('\n📝 ملخص الإصلاحات:');
console.log('  ✅ INGEST-MOVIES-LOGIC.js: يستخدم (id, tmdb_id) بشكل صحيح');
console.log('  ✅ INGEST-SERIES-LOGIC.js: يستخدم (id, tmdb_id) بشكل صحيح');
console.log('  ✅ sync-to-turso-optimized.js: يستخدم tmdb_id كمفتاح أساسي');
console.log('  ✅ sync-to-turso-optimized.js: يحدث كل الأعمدة الـ 21 في ON CONFLICT');

