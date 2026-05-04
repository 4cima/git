const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db');

console.log('🔄 تحديث الأعمال الغير مكتملة\n');
console.log('═'.repeat(60));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1️⃣ فحص الأعمال الغير مكتملة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n📊 فحص الأعمال الغير مكتملة:\n');

const incomplete = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN title_ar IS NULL OR title_ar = 'TBD' THEN 1 ELSE 0 END) as no_title_ar,
    SUM(CASE WHEN title_en IS NULL OR title_en = '' THEN 1 ELSE 0 END) as no_title_en,
    SUM(CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 ELSE 0 END) as no_overview_ar,
    SUM(CASE WHEN poster_path IS NULL OR poster_path = '' THEN 1 ELSE 0 END) as no_poster,
    SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie') THEN 1 ELSE 0 END) as no_cast,
    SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM content_genres WHERE content_id = movies.id AND content_type = 'movie') THEN 1 ELSE 0 END) as no_genres
  FROM movies 
  WHERE is_complete = 0 AND is_filtered = 0
`).get();

console.log(`📦 إجمالي الغير مكتملة: ${incomplete.total.toLocaleString()}`);
console.log(`   ❌ بدون title_ar: ${incomplete.no_title_ar.toLocaleString()}`);
console.log(`   ❌ بدون title_en: ${incomplete.no_title_en.toLocaleString()}`);
console.log(`   ❌ بدون overview_ar: ${incomplete.no_overview_ar.toLocaleString()}`);
console.log(`   ❌ بدون poster: ${incomplete.no_poster.toLocaleString()}`);
console.log(`   ❌ بدون cast: ${incomplete.no_cast.toLocaleString()}`);
console.log(`   ❌ بدون genres: ${incomplete.no_genres.toLocaleString()}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2️⃣ تحديد الأعمال القابلة للتحديث
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n🔍 البحث عن الأعمال القابلة للتحديث:\n');

const canBeComplete = db.prepare(`
  SELECT id FROM movies
  WHERE is_complete = 0 
  AND is_filtered = 0
  AND title_ar IS NOT NULL 
  AND title_ar != 'TBD'
  AND title_en IS NOT NULL 
  AND title_en != ''
  AND overview_ar IS NOT NULL 
  AND overview_ar != ''
  AND poster_path IS NOT NULL 
  AND poster_path != ''
  AND EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie')
  AND EXISTS (SELECT 1 FROM content_genres WHERE content_id = movies.id AND content_type = 'movie')
`).all();

console.log(`✅ أعمال قابلة للتحديث: ${canBeComplete.length.toLocaleString()}`);

if (canBeComplete.length === 0) {
  console.log('\n⚠️  لا توجد أعمال قابلة للتحديث');
  console.log('   جميع الأعمال الغير مكتملة تحتاج بيانات إضافية\n');
  db.close();
  process.exit(0);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3️⃣ تحديث الأعمال
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n🔄 بدء التحديث...\n');

const updateStmt = db.prepare(`
  UPDATE movies 
  SET is_complete = 1, updated_at = datetime('now')
  WHERE id = ?
`);

let updated = 0;
const batchSize = 1000;

for (let i = 0; i < canBeComplete.length; i += batchSize) {
  const batch = canBeComplete.slice(i, i + batchSize);
  
  const transaction = db.transaction(() => {
    for (const work of batch) {
      updateStmt.run(work.id);
      updated++;
    }
  });
  
  transaction();
  
  const progress = ((updated / canBeComplete.length) * 100).toFixed(1);
  process.stdout.write(`\r⏳ ${updated.toLocaleString()} / ${canBeComplete.length.toLocaleString()} (${progress}%)`);
}

console.log('\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4️⃣ التحقق من النتائج
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n📊 التحقق من النتائج:\n');

const afterUpdate = db.prepare(`
  SELECT 
    COUNT(*) as total_complete
  FROM movies 
  WHERE is_complete = 1 AND is_filtered = 0
`).get();

const stillIncomplete = db.prepare(`
  SELECT COUNT(*) as total
  FROM movies 
  WHERE is_complete = 0 AND is_filtered = 0
`).get();

console.log(`✅ إجمالي المكتملة الآن: ${afterUpdate.total_complete.toLocaleString()}`);
console.log(`⚠️  لا تزال غير مكتملة: ${stillIncomplete.total.toLocaleString()}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5️⃣ تحليل المتبقي الغير مكتمل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (stillIncomplete.total > 0) {
  console.log('\n🔍 تحليل الأعمال المتبقية الغير مكتملة:\n');
  
  const reasons = db.prepare(`
    SELECT 
      CASE 
        WHEN title_ar IS NULL OR title_ar = 'TBD' THEN 'no_title_ar'
        WHEN title_en IS NULL OR title_en = '' THEN 'no_title_en'
        WHEN overview_ar IS NULL OR overview_ar = '' THEN 'no_overview_ar'
        WHEN poster_path IS NULL OR poster_path = '' THEN 'no_poster'
        WHEN NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie') THEN 'no_cast'
        WHEN NOT EXISTS (SELECT 1 FROM content_genres WHERE content_id = movies.id AND content_type = 'movie') THEN 'no_genres'
        ELSE 'unknown'
      END as reason,
      COUNT(*) as count
    FROM movies
    WHERE is_complete = 0 AND is_filtered = 0
    GROUP BY reason
    ORDER BY count DESC
  `).all();
  
  reasons.forEach(r => {
    const percent = ((r.count / stillIncomplete.total) * 100).toFixed(1);
    console.log(`   ${r.reason}: ${r.count.toLocaleString()} (${percent}%)`);
  });
}

console.log('\n' + '═'.repeat(60));
console.log('✅ اكتمل التحديث!');
console.log(`📊 تم تحديث ${updated.toLocaleString()} عمل`);
console.log('═'.repeat(60) + '\n');

db.close();
