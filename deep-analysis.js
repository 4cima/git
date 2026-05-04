#!/usr/bin/env node

/**
 * 🔍 Deep Database Analysis
 * 
 * تحليل شامل وعميق لقاعدة البيانات مع أدلة فعلية
 */

const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true, timeout: 10000 });

console.log('🔍 التحليل العميق لقاعدة البيانات\n');
console.log('التاريخ:', new Date().toLocaleString('ar-SA'));
console.log('═'.repeat(100));

try {
  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎬 الأفلام - التحليل الشامل
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log('\n\n🎬 الأفلام - التحليل الشامل\n');
  console.log('─'.repeat(100));
  
  // 1. الإحصائيات الأساسية
  const m_total = db.prepare('SELECT COUNT(*) as c FROM movies').get();
  const m_fetched = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL').get();
  const m_not_fetched = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL').get();
  
  console.log('\n📊 الإحصائيات الأساسية:');
  console.log(`   إجمالي IDs: ${m_total.c.toLocaleString()}`);
  console.log(`   مسحوب: ${m_fetched.c.toLocaleString()} (${((m_fetched.c / m_total.c) * 100).toFixed(2)}%)`);
  console.log(`   لم يُسحب: ${m_not_fetched.c.toLocaleString()} (${((m_not_fetched.c / m_total.c) * 100).toFixed(2)}%)`);
  
  // 2. تحليل المسحوب
  console.log('\n📥 تحليل المسحوب (overview_en موجود):');
  
  const m_complete = db.prepare(`
    SELECT COUNT(*) as c FROM movies 
    WHERE overview_en IS NOT NULL 
    AND is_complete = 1
  `).get();
  
  const m_incomplete = db.prepare(`
    SELECT COUNT(*) as c FROM movies 
    WHERE overview_en IS NOT NULL 
    AND is_complete = 0
  `).get();
  
  console.log(`   مكتمل: ${m_complete.c.toLocaleString()} (${((m_complete.c / m_fetched.c) * 100).toFixed(2)}% من المسحوب)`);
  console.log(`   غير مكتمل: ${m_incomplete.c.toLocaleString()} (${((m_incomplete.c / m_fetched.c) * 100).toFixed(2)}% من المسحوب)`);
  
  // 3. تحليل غير المكتمل - أسباب عدم الاكتمال
  console.log('\n❌ أسباب عدم الاكتمال (من المسحوب):');
  
  const m_no_title_ar = db.prepare(`
    SELECT COUNT(*) as c FROM movies 
    WHERE overview_en IS NOT NULL 
    AND (title_ar IS NULL OR title_ar = '')
  `).get();
  
  const m_no_overview_ar = db.prepare(`
    SELECT COUNT(*) as c FROM movies 
    WHERE overview_en IS NOT NULL 
    AND (overview_ar IS NULL OR overview_ar = '')
  `).get();
  
  const m_no_poster = db.prepare(`
    SELECT COUNT(*) as c FROM movies 
    WHERE overview_en IS NOT NULL 
    AND (poster_path IS NULL OR poster_path = '')
  `).get();
  
  const m_no_backdrop = db.prepare(`
    SELECT COUNT(*) as c FROM movies 
    WHERE overview_en IS NOT NULL 
    AND (backdrop_path IS NULL OR backdrop_path = '')
  `).get();
  
  const m_no_release = db.prepare(`
    SELECT COUNT(*) as c FROM movies 
    WHERE overview_en IS NOT NULL 
    AND (release_date IS NULL OR release_date = '')
  `).get();
  
  console.log(`   بدون title_ar: ${m_no_title_ar.c.toLocaleString()}`);
  console.log(`   بدون overview_ar: ${m_no_overview_ar.c.toLocaleString()}`);
  console.log(`   بدون poster_path: ${m_no_poster.c.toLocaleString()}`);
  console.log(`   بدون backdrop_path: ${m_no_backdrop.c.toLocaleString()}`);
  console.log(`   بدون release_date: ${m_no_release.c.toLocaleString()}`);
  
  // 4. تحليل الفلترة
  console.log('\n🚫 تحليل الفلترة:');
  
  const m_filtered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1').get();
  const m_not_filtered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 0').get();
  
  console.log(`   مفلتر: ${m_filtered.c.toLocaleString()} (${((m_filtered.c / m_total.c) * 100).toFixed(2)}% من الإجمالي)`);
  console.log(`   غير مفلتر: ${m_not_filtered.c.toLocaleString()} (${((m_not_filtered.c / m_total.c) * 100).toFixed(2)}% من الإجمالي)`);
  
  // 5. أنواع الفلاتر وأعدادها
  console.log('\n📋 أنواع الفلاتر وأعدادها:');
  
  const m_filter_types = db.prepare(`
    SELECT filter_reason, COUNT(*) as count 
    FROM movies 
    WHERE is_filtered = 1 
    GROUP BY filter_reason 
    ORDER BY count DESC
  `).all();
  
  m_filter_types.forEach(f => {
    const percentage = ((f.count / m_filtered.c) * 100).toFixed(2);
    console.log(`   ${f.filter_reason || 'NULL'}: ${f.count.toLocaleString()} (${percentage}%)`);
  });
  
  // 6. تحليل غير المسحوب
  console.log('\n📤 تحليل غير المسحوب (overview_en = NULL):');
  
  const m_not_fetched_filtered = db.prepare(`
    SELECT COUNT(*) as c FROM movies 
    WHERE overview_en IS NULL 
    AND is_filtered = 1
  `).get();
  
  const m_not_fetched_not_filtered = db.prepare(`
    SELECT COUNT(*) as c FROM movies 
    WHERE overview_en IS NULL 
    AND is_filtered = 0
  `).get();
  
  console.log(`   مفلتر: ${m_not_fetched_filtered.c.toLocaleString()}`);
  console.log(`   غير مفلتر: ${m_not_fetched_not_filtered.c.toLocaleString()}`);
  
  // 7. عينة من غير المسحوب غير المفلتر
  if (m_not_fetched_not_filtered.c > 0) {
    console.log('\n📝 عينة من الأفلام غير المسحوبة غير المفلترة:');
    const sample = db.prepare(`
      SELECT id, title_en 
      FROM movies 
      WHERE overview_en IS NULL 
      AND is_filtered = 0 
      LIMIT 10
    `).all();
    sample.forEach(m => console.log(`   ${m.id}: ${m.title_en || 'NO TITLE'}`));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 📺 المسلسلات - التحليل الشامل
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log('\n\n📺 المسلسلات - التحليل الشامل\n');
  console.log('─'.repeat(100));
  
  // 1. الإحصائيات الأساسية
  const s_total = db.prepare('SELECT COUNT(*) as c FROM tv_series').get();
  const s_fetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL').get();
  const s_not_fetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NULL').get();
  
  console.log('\n📊 الإحصائيات الأساسية:');
  console.log(`   إجمالي IDs: ${s_total.c.toLocaleString()}`);
  console.log(`   مسحوب: ${s_fetched.c.toLocaleString()} (${((s_fetched.c / s_total.c) * 100).toFixed(2)}%)`);
  console.log(`   لم يُسحب: ${s_not_fetched.c.toLocaleString()} (${((s_not_fetched.c / s_total.c) * 100).toFixed(2)}%)`);
  
  // 2. تحليل المسحوب
  console.log('\n📥 تحليل المسحوب (overview_en موجود):');
  
  const s_complete = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series 
    WHERE overview_en IS NOT NULL 
    AND is_complete = 1
  `).get();
  
  const s_incomplete = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series 
    WHERE overview_en IS NOT NULL 
    AND is_complete = 0
  `).get();
  
  console.log(`   مكتمل: ${s_complete.c.toLocaleString()} (${((s_complete.c / s_fetched.c) * 100).toFixed(2)}% من المسحوب)`);
  console.log(`   غير مكتمل: ${s_incomplete.c.toLocaleString()} (${((s_incomplete.c / s_fetched.c) * 100).toFixed(2)}% من المسحوب)`);
  
  // 3. تحليل غير المكتمل - أسباب عدم الاكتمال
  console.log('\n❌ أسباب عدم الاكتمال (من المسحوب):');
  
  const s_no_title_ar = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series 
    WHERE overview_en IS NOT NULL 
    AND (title_ar IS NULL OR title_ar = '')
  `).get();
  
  const s_no_overview_ar = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series 
    WHERE overview_en IS NOT NULL 
    AND (overview_ar IS NULL OR overview_ar = '')
  `).get();
  
  const s_no_poster = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series 
    WHERE overview_en IS NOT NULL 
    AND (poster_path IS NULL OR poster_path = '')
  `).get();
  
  const s_no_backdrop = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series 
    WHERE overview_en IS NOT NULL 
    AND (backdrop_path IS NULL OR backdrop_path = '')
  `).get();
  
  const s_no_first_air = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series 
    WHERE overview_en IS NOT NULL 
    AND (first_air_date IS NULL OR first_air_date = '')
  `).get();
  
  console.log(`   بدون title_ar: ${s_no_title_ar.c.toLocaleString()}`);
  console.log(`   بدون overview_ar: ${s_no_overview_ar.c.toLocaleString()}`);
  console.log(`   بدون poster_path: ${s_no_poster.c.toLocaleString()}`);
  console.log(`   بدون backdrop_path: ${s_no_backdrop.c.toLocaleString()}`);
  console.log(`   بدون first_air_date: ${s_no_first_air.c.toLocaleString()}`);
  
  // 4. تحليل الفلترة
  console.log('\n🚫 تحليل الفلترة:');
  
  const s_filtered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1').get();
  const s_not_filtered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 0').get();
  
  console.log(`   مفلتر: ${s_filtered.c.toLocaleString()} (${((s_filtered.c / s_total.c) * 100).toFixed(2)}% من الإجمالي)`);
  console.log(`   غير مفلتر: ${s_not_filtered.c.toLocaleString()} (${((s_not_filtered.c / s_total.c) * 100).toFixed(2)}% من الإجمالي)`);
  
  // 5. أنواع الفلاتر وأعدادها
  console.log('\n📋 أنواع الفلاتر وأعدادها:');
  
  const s_filter_types = db.prepare(`
    SELECT filter_reason, COUNT(*) as count 
    FROM tv_series 
    WHERE is_filtered = 1 
    GROUP BY filter_reason 
    ORDER BY count DESC
  `).all();
  
  s_filter_types.forEach(f => {
    const percentage = ((f.count / s_filtered.c) * 100).toFixed(2);
    console.log(`   ${f.filter_reason || 'NULL'}: ${f.count.toLocaleString()} (${percentage}%)`);
  });
  
  // 6. تحليل غير المسحوب
  console.log('\n📤 تحليل غير المسحوب (overview_en = NULL):');
  
  const s_not_fetched_filtered = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series 
    WHERE overview_en IS NULL 
    AND is_filtered = 1
  `).get();
  
  const s_not_fetched_not_filtered = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series 
    WHERE overview_en IS NULL 
    AND is_filtered = 0
  `).get();
  
  console.log(`   مفلتر: ${s_not_fetched_filtered.c.toLocaleString()}`);
  console.log(`   غير مفلتر: ${s_not_fetched_not_filtered.c.toLocaleString()}`);
  
  // 7. عينة من غير المسحوب غير المفلتر
  if (s_not_fetched_not_filtered.c > 0) {
    console.log('\n📝 عينة من المسلسلات غير المسحوبة غير المفلترة:');
    const sample = db.prepare(`
      SELECT id, title_en 
      FROM tv_series 
      WHERE overview_en IS NULL 
      AND is_filtered = 0 
      LIMIT 10
    `).all();
    sample.forEach(s => console.log(`   ${s.id}: ${s.title_en || 'NO TITLE'}`));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 📊 الملخص النهائي
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log('\n\n📊 الملخص النهائي\n');
  console.log('═'.repeat(100));
  
  const total_works = m_total.c + s_total.c;
  const total_fetched = m_fetched.c + s_fetched.c;
  const total_complete = m_complete.c + s_complete.c;
  const total_filtered = m_filtered.c + s_filtered.c;
  
  console.log(`\n🎯 إجمالي الأعمال: ${total_works.toLocaleString()}`);
  console.log(`   📥 مسحوب: ${total_fetched.toLocaleString()} (${((total_fetched / total_works) * 100).toFixed(2)}%)`);
  console.log(`   ✅ مكتمل: ${total_complete.toLocaleString()} (${((total_complete / total_fetched) * 100).toFixed(2)}% من المسحوب)`);
  console.log(`   🚫 مفلتر: ${total_filtered.toLocaleString()} (${((total_filtered / total_works) * 100).toFixed(2)}% من الإجمالي)`);
  
  console.log('\n' + '═'.repeat(100));
  console.log('✅ اكتمل التحليل بنجاح');
  
} catch (e) {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
} finally {
  db.close();
}
