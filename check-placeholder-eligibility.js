const Database = require('better-sqlite3');
const db = new Database('data/4cima-local.db', { readonly: true });

console.log('🔍 هل الـ placeholder مستهدفة من INGEST-SERIES-LOGIC.js؟\n');
console.log('═'.repeat(70));

// الشرط الفعلي من السكريبت
const targetedPlaceholders = db.prepare(`
  SELECT COUNT(*) as cnt FROM tv_series
  WHERE name_en LIKE 'Item %'
  AND (
    (overview_en IS NULL AND is_filtered = 0)
    OR (overview_en IS NOT NULL AND (name_ar = 'TBD' OR name_ar IS NULL))
    OR (overview_en IS NOT NULL AND number_of_seasons > 0
        AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_id = tv_series.id))
    OR (overview_en IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = tv_series.id AND content_type = 'tv'))
  )
`).get();

console.log(`✅ الـ placeholder المستهدفة: ${targetedPlaceholders.cnt.toLocaleString()} من 179,495`);

// فحص تفصيلي: ما هي حالة overview_en و name_ar في الـ placeholder؟
console.log('\nحالة البيانات في الـ placeholder:\n');

const placeholderStatus = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN overview_en IS NULL THEN 1 ELSE 0 END) as no_overview,
    SUM(CASE WHEN name_ar = 'TBD' OR name_ar IS NULL THEN 1 ELSE 0 END) as no_name_ar,
    SUM(CASE WHEN is_filtered = 1 THEN 1 ELSE 0 END) as filtered
  FROM tv_series
  WHERE name_en LIKE 'Item %'
`).get();

console.log(`   overview_en NULL: ${placeholderStatus.no_overview.toLocaleString()}`);
console.log(`   name_ar 'TBD' أو NULL: ${placeholderStatus.no_name_ar.toLocaleString()}`);
console.log(`   is_filtered = 1: ${placeholderStatus.filtered.toLocaleString()}`);

// عينة من placeholder للتأكد
console.log('\nعينة من أول 5 placeholder:\n');
const samples = db.prepare(`
  SELECT id, tmdb_id, name_en, name_ar, overview_en, is_filtered
  FROM tv_series
  WHERE name_en LIKE 'Item %'
  LIMIT 5
`).all();

samples.forEach(s => {
  console.log(`id=${s.id}, tmdb=${s.tmdb_id}`);
  console.log(`  name_en="${s.name_en}", name_ar="${s.name_ar}"`);
  console.log(`  overview_en=${s.overview_en === null ? 'NULL' : 'موجود'}, is_filtered=${s.is_filtered}\n`);
});

console.log('═'.repeat(70));

console.log('\n📊 الخلاصة:');
if (targetedPlaceholders.cnt === 179495) {
  console.log('   ✅ كل الـ 179,495 placeholder مستهدفة من INGEST-SERIES-LOGIC.js');
} else if (targetedPlaceholders.cnt > 0) {
  console.log(`   ⚠️  ${targetedPlaceholders.cnt.toLocaleString()} placeholder مستهدفة، ${(179495 - targetedPlaceholders.cnt).toLocaleString()} غير مستهدفة`);
} else {
  console.log('   ❌ صفر placeholder مستهدفة - INGEST لن يعالجهم');
}

db.close();
