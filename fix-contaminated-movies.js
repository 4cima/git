require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/services/local-db');

console.log('🔄 إعادة ضبط الأفلام الملوثة لإعادة معالجتها...\n');

// إيجاد الأفلام الملوثة
const contaminated = db.prepare(`
  SELECT id, tmdb_id, title_ar
  FROM movies
  WHERE id != tmdb_id
    AND updated_at >= '2026-07-20'
`).all();

console.log(`📊 عدد الأفلام الملوثة: ${contaminated.length}\n`);

if (contaminated.length === 0) {
  console.log('✅ لا توجد أفلام ملوثة');
  process.exit(0);
}

// إعادة ضبط الحالة لإعادة المعالجة
const reset = db.prepare(`
  UPDATE movies 
  SET 
    overview_en = NULL,
    is_complete = 0,
    synced_to_turso = 0
  WHERE id = ?
`);

for (const movie of contaminated) {
  reset.run(movie.id);
  console.log(`🔄 إعادة ضبط: id=${movie.id} | tmdb_id=${movie.tmdb_id} | ${movie.title_ar}`);
}

console.log(`\n✅ تم إعادة ضبط ${contaminated.length} فيلم`);
console.log('💡 السكريبتات المصلحة سوف تعيد معالجتهم بالبيانات الصحيحة');
