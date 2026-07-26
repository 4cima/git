#!/usr/bin/env node
/**
 * ============================================
 * 🔧 TV FLAGS REPAIR - OPTIMIZED
 * ============================================
 */

const db = require('./services/local-db');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔧 إصلاح flags المسلسلات (محسّن)');
console.log('═══════════════════════════════════════════════════════════════\n');

// ============================================================
// STEP 0: Create indexes للسرعة
// ============================================================
console.log('⏳ إنشاء indexes...\n');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_cast_crew_content 
  ON cast_crew(content_type, content_id, role_type);
  
  CREATE INDEX IF NOT EXISTS idx_content_genres_content 
  ON content_genres(content_type, content_id);
  
  CREATE INDEX IF NOT EXISTS idx_seasons_series 
  ON seasons(series_id);
  
  ANALYZE;
`);

console.log('  ✅ Indexes جاهزة\n');

// ============================================================
// STEP 1: قياس الوضع الحالي
// ============================================================
console.log('📊 الوضع الحالي (قبل الإصلاح):\n');

const before = db.prepare(`
  SELECT 
    COUNT(*) as total_fetched,
    SUM(CASE WHEN is_complete=1 AND is_filtered=0 THEN 1 ELSE 0 END) as complete,
    SUM(CASE WHEN is_filtered=0 AND is_complete=0 THEN 1 ELSE 0 END) as incomplete,
    SUM(CASE WHEN has_cast=0 THEN 1 ELSE 0 END) as flag_no_cast,
    SUM(CASE WHEN has_genres=0 THEN 1 ELSE 0 END) as flag_no_genres
  FROM tv_series 
  WHERE overview_en IS NOT NULL
`).get();

console.log(`  إجمالي المسحوب: ${before.total_fetched.toLocaleString()}`);
console.log(`  مكتمل: ${before.complete.toLocaleString()} (${((before.complete/before.total_fetched)*100).toFixed(1)}%)`);
console.log(`  غير مكتمل: ${before.incomplete.toLocaleString()}\n`);

// Flag mismatches
const castMismatch = db.prepare(`
  SELECT COUNT(*) as cnt
  FROM tv_series 
  WHERE has_cast = 0
  AND EXISTS (SELECT 1 FROM cast_crew WHERE content_id = tv_series.id AND content_type = 'tv' LIMIT 1)
`).get();

console.log(`  ⚠️  Flags غلط: has_cast=0 لكن فيه cast: ${castMismatch.cnt.toLocaleString()}\n`);

// ============================================================
// STEP 2: إعادة حساب الـ flags (بطريقة محسّنة)
// ============================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔄 إعادة حساب الـ flags (batches)...\n');

const BATCH_SIZE = 5000;
const totalRows = db.prepare('SELECT COUNT(*) as c FROM tv_series').get().c;
let processed = 0;

db.exec('BEGIN IMMEDIATE');

try {
  // 1. Reset all flags to 0 first
  console.log('  ⏳ Reset flags...');
  db.prepare(`
    UPDATE tv_series 
    SET has_cast = 0, has_genres = 0, has_trailer = 0, 
        has_keywords = 0, has_arabic_title = 0, has_arabic_overview = 0
  `).run();
  console.log('     ✅ تم\n');

  // 2. Set has_cast = 1 للي عندهم cast
  console.log('  ⏳ إعادة حساب has_cast...');
  const castIds = db.prepare(`
    SELECT DISTINCT content_id as id 
    FROM cast_crew 
    WHERE content_type = 'tv' AND role_type = 'cast'
  `).all();
  
  for (let i = 0; i < castIds.length; i += BATCH_SIZE) {
    const batch = castIds.slice(i, i + BATCH_SIZE);
    const ids = batch.map(r => r.id).join(',');
    db.prepare(`UPDATE tv_series SET has_cast = 1 WHERE id IN (${ids})`).run();
    processed += batch.length;
    process.stdout.write(`\r     ${processed.toLocaleString()} / ${castIds.length.toLocaleString()}`);
  }
  console.log('\n     ✅ تم\n');

  // 3. Set has_genres = 1
  console.log('  ⏳ إعادة حساب has_genres...');
  processed = 0;
  const genreIds = db.prepare(`
    SELECT DISTINCT content_id as id 
    FROM content_genres 
    WHERE content_type = 'tv'
  `).all();
  
  for (let i = 0; i < genreIds.length; i += BATCH_SIZE) {
    const batch = genreIds.slice(i, i + BATCH_SIZE);
    const ids = batch.map(r => r.id).join(',');
    db.prepare(`UPDATE tv_series SET has_genres = 1 WHERE id IN (${ids})`).run();
    processed += batch.length;
    process.stdout.write(`\r     ${processed.toLocaleString()} / ${genreIds.length.toLocaleString()}`);
  }
  console.log('\n     ✅ تم\n');

  // 4-6. Simple field checks (سريعة)
  console.log('  ⏳ إعادة حساب has_trailer, has_keywords, has_arabic_*...');
  db.prepare(`
    UPDATE tv_series 
    SET 
      has_trailer = CASE WHEN trailer_key IS NOT NULL AND trailer_key <> '' THEN 1 ELSE 0 END,
      has_keywords = CASE WHEN keywords IS NOT NULL AND TRIM(keywords) <> '' THEN 1 ELSE 0 END,
      has_arabic_title = CASE WHEN title_ar IS NOT NULL AND TRIM(title_ar) <> '' AND title_ar <> 'TBD' THEN 1 ELSE 0 END,
      has_arabic_overview = CASE WHEN overview_ar IS NOT NULL AND TRIM(overview_ar) <> '' THEN 1 ELSE 0 END
  `).run();
  console.log('     ✅ تم\n');

  db.exec('COMMIT');
  console.log('  ✅ تم حفظ التغييرات\n');

} catch (e) {
  db.exec('ROLLBACK');
  console.error('\n  ❌ خطأ:', e.message);
  process.exit(1);
}

// ============================================================
// STEP 3: إعادة حساب is_complete
// ============================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔄 إعادة حساب is_complete...\n');

db.exec('BEGIN IMMEDIATE');

try {
  // Get series with seasons
  const withSeasons = db.prepare(`
    SELECT DISTINCT series_id as id FROM seasons
  `).all();
  
  const seasonIds = new Set(withSeasons.map(r => r.id));
  
  // Update in batches
  console.log('  ⏳ تحديث is_complete...');
  processed = 0;
  
  for (let offset = 0; offset < totalRows; offset += BATCH_SIZE) {
    const series = db.prepare(`
      SELECT id, number_of_seasons 
      FROM tv_series 
      LIMIT ? OFFSET ?
    `).all(BATCH_SIZE, offset);
    
    for (const s of series) {
      const hasSeasons = s.number_of_seasons === 0 || s.number_of_seasons === null || seasonIds.has(s.id);
      
      db.prepare(`
        UPDATE tv_series 
        SET is_complete = CASE 
          WHEN is_filtered = 0
          AND has_arabic_title = 1
          AND title_en IS NOT NULL AND TRIM(title_en) <> ''
          AND has_arabic_overview = 1
          AND poster_path IS NOT NULL AND TRIM(poster_path) <> ''
          AND ? = 1
          THEN 1 ELSE 0 END
        WHERE id = ?
      `).run(hasSeasons ? 1 : 0, s.id);
    }
    
    processed += series.length;
    process.stdout.write(`\r     ${processed.toLocaleString()} / ${totalRows.toLocaleString()}`);
  }
  
  console.log('\n     ✅ تم\n');
  
  db.exec('COMMIT');

} catch (e) {
  db.exec('ROLLBACK');
  console.error('\n  ❌ خطأ:', e.message);
  process.exit(1);
}

// ============================================================
// STEP 4: النتائج النهائية
// ============================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 الوضع بعد الإصلاح:\n');

const after = db.prepare(`
  SELECT 
    COUNT(*) as total_fetched,
    SUM(CASE WHEN is_complete=1 AND is_filtered=0 THEN 1 ELSE 0 END) as complete,
    SUM(CASE WHEN is_filtered=0 AND is_complete=0 THEN 1 ELSE 0 END) as incomplete
  FROM tv_series 
  WHERE overview_en IS NOT NULL
`).get();

console.log(`  إجمالي المسحوب: ${after.total_fetched.toLocaleString()}`);
console.log(`  مكتمل: ${after.complete.toLocaleString()} (${((after.complete/after.total_fetched)*100).toFixed(1)}%)`);
console.log(`  غير مكتمل: ${after.incomplete.toLocaleString()}\n`);

const completeDiff = after.complete - before.complete;
console.log(`  📈 التحسين: ${completeDiff >= 0 ? '+' : ''}${completeDiff.toLocaleString()} مسلسل\n`);

// الناقص الحقيقي
const missingCast = db.prepare(`
  SELECT COUNT(*) as cnt FROM tv_series 
  WHERE overview_en IS NOT NULL AND is_filtered = 0
  AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = tv_series.id AND content_type = 'tv' LIMIT 1)
`).get();

console.log(`  🔍 الناقص الحقيقي (يحتاج repair):`);
console.log(`     بدون cast: ${missingCast.cnt.toLocaleString()}\n`);

console.log('═══════════════════════════════════════════════════════════════');
console.log('✅ اكتمل الإصلاح!');
console.log('═══════════════════════════════════════════════════════════════\n');