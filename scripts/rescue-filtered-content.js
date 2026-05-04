#!/usr/bin/env node
/**
 * 🚀 إنقاذ المحتوى المفلتر
 * يزيل الفلترة من الأعمال التي لديها بيانات كافية
 */

require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');

console.log('🚀 إنقاذ المحتوى المفلتر\n');
console.log('═'.repeat(100));

const stats = {
  moviesUnfiltered: 0,
  seriesUnfiltered: 0,
  errors: 0,
  start: Date.now()
};

// ============ الأفلام ============
console.log('\n🎬 معالجة الأفلام:\n');

// 1. أفلام مفلترة بدون وصف فقط (لكن باقي البيانات موجودة وجيدة)
console.log('1️⃣ إزالة فلترة الأفلام بدون وصف (باقي البيانات موجودة)...');
try {
  const result = db.prepare(`
    UPDATE movies 
    SET is_filtered = 0, filter_reason = NULL
    WHERE is_filtered = 1 
    AND filter_reason = 'no_overview'
    AND title_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).run();
  
  stats.moviesUnfiltered += result.changes;
  console.log(`   ✅ تم إزالة الفلترة من: ${result.changes.toLocaleString()} فيلم\n`);
} catch (error) {
  console.log(`   ❌ خطأ: ${error.message}\n`);
  stats.errors++;
}

// 2. أفلام مفلترة بدون poster فقط (لكن باقي البيانات موجودة وجيدة)
console.log('2️⃣ إزالة فلترة الأفلام بدون poster (باقي البيانات موجودة)...');
try {
  const result = db.prepare(`
    UPDATE movies 
    SET is_filtered = 0, filter_reason = NULL
    WHERE is_filtered = 1 
    AND filter_reason = 'no_poster'
    AND title_en IS NOT NULL
    AND overview_en IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).run();
  
  stats.moviesUnfiltered += result.changes;
  console.log(`   ✅ تم إزالة الفلترة من: ${result.changes.toLocaleString()} فيلم\n`);
} catch (error) {
  console.log(`   ❌ خطأ: ${error.message}\n`);
  stats.errors++;
}

// 3. أفلام مفلترة بسبب تقييم منخفض فقط (لكن باقي البيانات موجودة)
console.log('3️⃣ إزالة فلترة الأفلام برقم منخفض (باقي البيانات موجودة)...');
try {
  const result = db.prepare(`
    UPDATE movies 
    SET is_filtered = 0, filter_reason = NULL
    WHERE is_filtered = 1 
    AND filter_reason = 'low_rating'
    AND title_en IS NOT NULL
    AND overview_en IS NOT NULL
    AND poster_path IS NOT NULL
  `).run();
  
  stats.moviesUnfiltered += result.changes;
  console.log(`   ✅ تم إزالة الفلترة من: ${result.changes.toLocaleString()} فيلم\n`);
} catch (error) {
  console.log(`   ❌ خطأ: ${error.message}\n`);
  stats.errors++;
}

// ============ المسلسلات ============
console.log('\n📺 معالجة المسلسلات:\n');

// 1. مسلسلات مفلترة بدون وصف فقط (لكن باقي البيانات موجودة)
console.log('1️⃣ إزالة فلترة المسلسلات بدون وصف (باقي البيانات موجودة)...');
try {
  const result = db.prepare(`
    UPDATE tv_series 
    SET is_filtered = 0, filter_reason = NULL
    WHERE is_filtered = 1 
    AND filter_reason = 'no_overview'
    AND name_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).run();
  
  stats.seriesUnfiltered += result.changes;
  console.log(`   ✅ تم إزالة الفلترة من: ${result.changes.toLocaleString()} مسلسل\n`);
} catch (error) {
  console.log(`   ❌ خطأ: ${error.message}\n`);
  stats.errors++;
}

// 2. مسلسلات مفلترة بدون poster فقط (لكن باقي البيانات موجودة)
console.log('2️⃣ إزالة فلترة المسلسلات بدون poster (باقي البيانات موجودة)...');
try {
  const result = db.prepare(`
    UPDATE tv_series 
    SET is_filtered = 0, filter_reason = NULL
    WHERE is_filtered = 1 
    AND filter_reason = 'no_poster'
    AND name_en IS NOT NULL
    AND overview_ar IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).run();
  
  stats.seriesUnfiltered += result.changes;
  console.log(`   ✅ تم إزالة الفلترة من: ${result.changes.toLocaleString()} مسلسل\n`);
} catch (error) {
  console.log(`   ❌ خطأ: ${error.message}\n`);
  stats.errors++;
}

// 3. مسلسلات مفلترة بسبب تقييم منخفض فقط (لكن باقي البيانات موجودة)
console.log('3️⃣ إزالة فلترة المسلسلات برقم منخفض (باقي البيانات موجودة)...');
try {
  const result = db.prepare(`
    UPDATE tv_series 
    SET is_filtered = 0, filter_reason = NULL
    WHERE is_filtered = 1 
    AND filter_reason = 'low_rating'
    AND name_en IS NOT NULL
    AND overview_ar IS NOT NULL
    AND poster_path IS NOT NULL
  `).run();
  
  stats.seriesUnfiltered += result.changes;
  console.log(`   ✅ تم إزالة الفلترة من: ${result.changes.toLocaleString()} مسلسل\n`);
} catch (error) {
  console.log(`   ❌ خطأ: ${error.message}\n`);
  stats.errors++;
}

// ============ الملخص ============
const totalTime = ((Date.now() - stats.start) / 1000).toFixed(1);
console.log('\n' + '═'.repeat(100));
console.log('✅ اكتملت العملية!\n');
console.log(`📊 الإحصائيات:`);
console.log(`   🎬 أفلام تم إنقاذها: ${stats.moviesUnfiltered.toLocaleString()}`);
console.log(`   📺 مسلسلات تم إنقاذها: ${stats.seriesUnfiltered.toLocaleString()}`);
console.log(`   📈 الإجمالي: ${(stats.moviesUnfiltered + stats.seriesUnfiltered).toLocaleString()}`);
console.log(`   ❌ أخطاء: ${stats.errors}`);
console.log(`   ⏱️  الوقت: ${totalTime} ثانية\n`);
