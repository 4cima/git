// دالة الفحص الواضحة: هل الـ slug بينتهي بـ -{tmdb_id}؟
// ملحوظة: لازم يكون single dash قبل الـ ID، مش double-dash
function hasIdSuffix(slug, tmdbId) {
  const suffix = '-' + tmdbId;
  // يتأكد إنه بينتهي بـ suffix وإن اللي قبله مش dash (يعني مش --)
  if (!slug.endsWith(suffix)) return false;
  
  const beforeSuffix = slug.slice(0, -suffix.length);
  // لو beforeSuffix فاضي أو بينتهي بـ dash، يبقى ده double-dash (مرفوض)
  return beforeSuffix.length > 0 && !beforeSuffix.endsWith('-');
}

// الاختبارات اليدوية
const tests = [
  { slug: 'item-10007', tmdbId: 10007, expected: true, reason: 'ينتهي بنفس الـ ID' },
  { slug: 'item-10007', tmdbId: 999, expected: false, reason: 'الـ ID مختلف' },
  { slug: 'helen-724606', tmdbId: 724606, expected: true, reason: 'ينتهي بنفس الـ ID' },
  { slug: 'helen-724606', tmdbId: 12345, expected: false, reason: 'الـ ID مختلف' },
  { slug: 'spider-man-2021', tmdbId: 557, expected: false, reason: '2021 سنة مش ID' },
  { slug: 'st-elsewhere', tmdbId: 30, expected: false, reason: 'مفيش ID في الـ slug' },
  { slug: 'castle--5243', tmdbId: 5243, expected: false, reason: 'double-dash مش single' }
];

console.log('🧪 اختبار دالة hasIdSuffix:\n');

let passed = 0;
let failed = 0;

tests.forEach((test, i) => {
  const result = hasIdSuffix(test.slug, test.tmdbId);
  const status = result === test.expected ? '✅' : '❌';
  
  if (result === test.expected) passed++;
  else failed++;
  
  console.log(`${i+1}. ${status} slug="${test.slug}", tmdbId=${test.tmdbId}`);
  console.log(`   Expected: ${test.expected}, Got: ${result}`);
  console.log(`   Reason: ${test.reason}\n`);
});

console.log(`\n📊 النتيجة: ${passed}/${tests.length} نجح, ${failed} فشل`);

if (failed === 0) {
  console.log('\n✅ كل الاختبارات نجحت - الدالة صحيحة');
} else {
  console.log('\n❌ فيه اختبارات فشلت - الدالة محتاجة تصليح');
}
