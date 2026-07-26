#!/usr/bin/env node
/**
 * التحقق النهائي بدون افتراضات
 */

const db = require('./scripts/services/local-db');
const { shouldFilterContent, isExplicitContent } = require('./scripts/services/content-filter');

const flaggedMovies = [
  5, 14, 24, 25, 28, 33, 59, 63, 65, 73,
  76, 77, 78, 82, 83, 90, 91, 96, 98, 100,
  101, 103, 106, 107, 108, 109, 110, 111, 113, 114,
  115, 116, 117, 121, 128, 141, 142, 145, 149, 150,
  155, 158
];

console.log('=' .repeat(80));
console.log('1️⃣  البحث عن نسخ قديمة من content-filter.js في BACKUP');
console.log('=' .repeat(80));

console.log('\n❌ لا توجد نسخة قديمة من content-filter.js في BACKUP/');
console.log('   • BACKUP/scripts/ يحتوي فقط على:');
console.log('     - INGEST-MOVIES-LOGIC.js.backup');
console.log('     - INGEST-SERIES-LOGIC.js.backup');
console.log('     - sync-to-turso-optimized.js.backup');
console.log('     - sync-to-turso-ultra-fast.js.backup');
console.log('\n📌 الاستنتاج: لا يمكن التحقق من محتوى الفلتر القديم بشكل قاطع');

console.log('\n' + '='.repeat(80));
console.log('2️⃣  فحص filter_reason للـ42 فيلم في local.db');
console.log('=' .repeat(80));

const placeholders = flaggedMovies.map(() => '?').join(',');
const query = `
  SELECT tmdb_id, title_en, is_filtered, filter_reason
  FROM movies 
  WHERE tmdb_id IN (${placeholders})
  ORDER BY tmdb_id
`;

const results = db.prepare(query).all(...flaggedMovies);

console.log(`\n🔍 فحص filter_reason:\n`);

let nullCount = 0;
let withReasonCount = 0;
const reasons = new Set();

results.forEach(row => {
  if (!row.filter_reason || row.filter_reason === 'NULL') {
    nullCount++;
    console.log(`   [${row.tmdb_id}] ${row.title_en.substring(0, 40).padEnd(40)} → filter_reason=NULL`);
  } else {
    withReasonCount++;
    reasons.add(row.filter_reason);
    console.log(`   [${row.tmdb_id}] ${row.title_en.substring(0, 40).padEnd(40)} → "${row.filter_reason}"`);
  }
});

console.log(`\n📊 الملخص:`);
console.log(`   filter_reason = NULL: ${nullCount} فيلم`);
console.log(`   filter_reason موجود: ${withReasonCount} فيلم`);

if (nullCount === flaggedMovies.length) {
  console.log('\n🚨 CRITICAL: كل الـ42 فيلم filter_reason=NULL');
  console.log('   → الفلتر لم يُشغّل عليهم أبداً، أو تم مسح السبب');
} else if (withReasonCount > 0) {
  console.log('\n📋 الأسباب الموجودة:');
  reasons.forEach(r => console.log(`   • ${r}`));
}

console.log('\n' + '='.repeat(80));
console.log('3️⃣  فحص الـ42 فيلم بالفلتر الحالي (من local.db مباشرة)');
console.log('=' .repeat(80));

console.log('\n⚠️  ملاحظة: الفلتر الحالي يحتاج بيانات من TMDB API');
console.log('   (keywords, release_dates, credits) وهي غير موجودة في local.db');
console.log('\n🔍 محاولة الفحص بالبيانات المتاحة في local.db:\n');

let cannotTest = 0;
let passedLocal = 0;
let failedLocal = 0;

results.slice(0, 10).forEach(row => {
  // محاولة إنشاء كائن شبيه بـ TMDB response من local.db
  const movieFromLocal = {
    id: row.tmdb_id,
    title: row.title_en,
    overview: '', // غير متاح في local.db بشكل كامل
    adult: false, // غير متاح
    // keywords, release_dates, credits غير متاحة
  };
  
  console.log(`   [${row.tmdb_id}] ${row.title_en}`);
  console.log(`      ❌ لا يمكن الفحص: البيانات المطلوبة (keywords, certifications) غير موجودة في local.db`);
  cannotTest++;
});

console.log(`\n... (نفس المشكلة مع الـ${flaggedMovies.length - 10} فيلم المتبقية)`);

console.log('\n📊 الخلاصة:');
console.log(`   ❌ لا يمكن فحص ${flaggedMovies.length} فيلم من local.db`);
console.log(`   → الفلتر يعتمد على بيانات TMDB API (keywords, release_dates)`);
console.log(`   → local.db لا يحتفظ بهذه البيانات الخام`);

console.log('\n' + '='.repeat(80));
console.log('🎯 التحليل النهائي بناءً على الأدلة الفعلية:');
console.log('=' .repeat(80));

console.log('\n✅ ما تم التحقق منه بشكل قاطع:');
console.log('   1. لا توجد نسخة backup من content-filter.js');
console.log('   2. filter_reason في local.db (سيظهر في النتيجة أعلاه)');
console.log('   3. الفلتر الحالي لا يمكن تطبيقه على local.db (بيانات ناقصة)');

console.log('\n⚠️  ما لا يمكن التحقق منه بشكل قاطع:');
console.log('   • محتوى الفلتر القديم (قبل 22 يوليو) - لا يوجد backup');
console.log('   • لماذا بالضبط تغير الفلتر في 22 يوليو - لا يوجد git log');

console.log('\n🔍 الدليل غير المباشر (من التواريخ):');
console.log('   • local.db created_at: 21 يوليو 23:07');
console.log('   • content-filter.js mtime: 22 يوليو 01:07 (بعد 2 ساعة)');
console.log('   • Turso created_at: 24 يوليو 23:53');
console.log('   → تسلسل منطقي: سحب → تعديل فلتر → مزامنة');

if (nullCount === flaggedMovies.length) {
  console.log('\n🚨 إذا كان filter_reason=NULL لكل الأفلام:');
  console.log('   → الفلتر القديم لم يكن يسجل السبب (أو تم مسحه)');
  console.log('   → لا يمكن معرفة لماذا سُمح لهم بالمرور');
} else {
  console.log('\n✅ إذا كان filter_reason موجود:');
  console.log('   → يمكن معرفة السبب التاريخي للفلترة');
}
