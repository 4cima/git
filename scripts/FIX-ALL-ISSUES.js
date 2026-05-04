require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');

console.log('\n🔧 إصلاح جميع المشاكل\n');
console.log('='.repeat(70));

const stats = {
  fixed: 0,
  errors: 0
};

// ============================================================
// 1. إصلاح حالة ingestion_progress
// ============================================================
console.log('\n1️⃣ إصلاح حالة ingestion_progress...');

try {
  const updated = db.prepare(`
    UPDATE ingestion_progress
    SET status = 'idle'
    WHERE status = 'running'
  `).run();
  
  console.log(`   ✅ تم تحديث ${updated.changes} سجل`);
  stats.fixed++;
} catch (e) {
  console.error(`   ❌ خطأ: ${e.message}`);
  stats.errors++;
}

// ============================================================
// 2. تحديث الأفلام المستقبلية
// ============================================================
console.log('\n2️⃣ تحديث الأفلام المستقبلية...');

try {
  const updated = db.prepare(`
    UPDATE movies
    SET is_complete = 0,
        is_filtered = 1,
        filter_reason = 'future_release'
    WHERE release_year > 2026
      AND is_complete = 1
  `).run();
  
  console.log(`   ✅ تم تحديث ${updated.changes} فيلم`);
  stats.fixed++;
} catch (e) {
  console.error(`   ❌ خطأ: ${e.message}`);
  stats.errors++;
}

// ============================================================
// 3. إصلاح المسلسلات المكتملة بدون مواسم
// ============================================================
console.log('\n3️⃣ إصلاح المسلسلات المكتملة بدون مواسم...');

try {
  const updated = db.prepare(`
    UPDATE tv_series
    SET is_complete = 0
    WHERE is_complete = 1
      AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_id = tv_series.id)
  `).run();
  
  console.log(`   ✅ تم تحديث ${updated.changes} مسلسل`);
  console.log(`   💡 هذه المسلسلات ستُكمل عند تشغيل سكريبت السحب`);
  stats.fixed++;
} catch (e) {
  console.error(`   ❌ خطأ: ${e.message}`);
  stats.errors++;
}

// ============================================================
// 4. التحقق من النتائج
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('📊 التحقق من النتائج:');
console.log('='.repeat(70));

// المسلسلات المكتملة بدون مواسم
const completeWithoutSeasons = db.prepare(`
  SELECT COUNT(*) as count
  FROM tv_series
  WHERE is_complete = 1
    AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_id = id)
`).get();

console.log(`\n   المسلسلات المكتملة بدون مواسم: ${completeWithoutSeasons.count}`);

// الأفلام المستقبلية المكتملة
const futureMovies = db.prepare(`
  SELECT COUNT(*) as count
  FROM movies
  WHERE release_year > 2026
    AND is_complete = 1
`).get();

console.log(`   الأفلام المستقبلية المكتملة: ${futureMovies.count}`);

// حالة ingestion_progress
const runningProgress = db.prepare(`
  SELECT COUNT(*) as count
  FROM ingestion_progress
  WHERE status = 'running'
`).get();

console.log(`   سكريبتات في حالة "running": ${runningProgress.count}`);

// ============================================================
// 5. الملخص
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('✅ الملخص:');
console.log('='.repeat(70));

console.log(`\n   تم الإصلاح: ${stats.fixed}`);
console.log(`   الأخطاء: ${stats.errors}`);

if (completeWithoutSeasons.count === 0 && futureMovies.count === 0 && runningProgress.count === 0) {
  console.log('\n✅ ممتاز! تم إصلاح جميع المشاكل!');
  console.log('   يمكنك الآن تشغيل سكريبتات السحب بأمان.');
} else {
  console.log('\n⚠️  لا تزال هناك بعض المشاكل:');
  if (completeWithoutSeasons.count > 0) {
    console.log(`   - ${completeWithoutSeasons.count} مسلسل مكتمل بدون مواسم`);
  }
  if (futureMovies.count > 0) {
    console.log(`   - ${futureMovies.count} فيلم مستقبلي مكتمل`);
  }
  if (runningProgress.count > 0) {
    console.log(`   - ${runningProgress.count} سكريبت في حالة "running"`);
  }
}

console.log('\n' + '='.repeat(70) + '\n');
