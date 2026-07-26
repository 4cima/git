require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/services/local-db');

console.log('🔍 فحص الأفلام المحلية المحتمل تلوثها...\n');

const rows = db.prepare(`
  SELECT id, tmdb_id, title_en, title_ar, updated_at
  FROM movies
  WHERE id != tmdb_id
    AND updated_at >= '2026-07-20'
  ORDER BY updated_at DESC
`).all();

console.log(`📊 عدد الأفلام المحلية المحتمل تلوثها في الجلسة دي: ${rows.length}\n`);

if (rows.length > 0) {
  console.log('🎬 أول 20 فيلم ملوث:\n');
  rows.slice(0, 20).forEach(r => {
    console.log(`id=${r.id} | tmdb الحقيقي=${r.tmdb_id} | ${r.title_en} | ${r.title_ar} | ${r.updated_at}`);
  });
  
  console.log(`\n⚠️ إجمالي: ${rows.length} فيلم محتاج إعادة معالجة`);
} else {
  console.log('✅ لا توجد أفلام ملوثة في هذه الجلسة');
}
