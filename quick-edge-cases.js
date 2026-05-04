const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db');

console.log('🔍 تحليل سريع للحالات الحدية\n');

// ============ الأفلام ============
console.log('🎬 الأفلام:\n');

// 1. لم يتم سحبها ولم يتم فلترتها
const m1 = db.prepare(`SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL AND is_filtered = 0`).get().c;
console.log(`1. لم يتم سحبها ولم يتم فلترتها: ${m1.toLocaleString()}`);

// 2. مفلترة بدون وصف فقط (باقي البيانات موجودة)
const m2 = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE is_filtered = 1 AND filter_reason = 'no_overview'
  AND title_en IS NOT NULL AND poster_path IS NOT NULL 
  AND vote_average IS NOT NULL AND vote_average >= 4.0
`).get().c;
console.log(`2. مفلترة بدون وصف فقط (باقي البيانات موجودة): ${m2.toLocaleString()}`);

// 3. مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي)
const m3 = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE is_filtered = 1 AND overview_en IS NOT NULL AND overview_ar IS NULL
  AND title_en IS NOT NULL AND poster_path IS NOT NULL 
  AND vote_average IS NOT NULL AND vote_average >= 4.0
`).get().c;
console.log(`3. مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي): ${m3.toLocaleString()}`);

// 4. مفلترة بدون اسم عربي فقط (لديها اسم إنجليزي)
const m4 = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE is_filtered = 1 AND title_en IS NOT NULL AND title_ar IS NULL
  AND overview_en IS NOT NULL AND poster_path IS NOT NULL 
  AND vote_average IS NOT NULL AND vote_average >= 4.0
`).get().c;
console.log(`4. مفلترة بدون اسم عربي فقط (لديها اسم إنجليزي): ${m4.toLocaleString()}`);

// 5. مفلترة بدون اسم إنجليزي
const m5 = db.prepare(`SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1 AND title_en IS NULL`).get().c;
console.log(`5. مفلترة بدون اسم إنجليزي: ${m5.toLocaleString()}`);

// 6. مفلترة بدون poster فقط (باقي البيانات موجودة)
const m6 = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE is_filtered = 1 AND filter_reason = 'no_poster'
  AND title_en IS NOT NULL AND overview_en IS NOT NULL 
  AND vote_average IS NOT NULL AND vote_average >= 4.0
`).get().c;
console.log(`6. مفلترة بدون poster فقط (باقي البيانات موجودة): ${m6.toLocaleString()}`);

// 7. مفلترة بسبب تقييم منخفض فقط (باقي البيانات موجودة)
const m7 = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE is_filtered = 1 AND filter_reason = 'low_rating'
  AND title_en IS NOT NULL AND overview_en IS NOT NULL AND poster_path IS NOT NULL
`).get().c;
console.log(`7. مفلترة بسبب تقييم منخفض فقط (باقي البيانات موجودة): ${m7.toLocaleString()}`);

// ============ المسلسلات ============
console.log('\n📺 المسلسلات:\n');

// 1. لم يتم سحبها ولم يتم فلترتها
const s1 = db.prepare(`SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NULL AND is_filtered = 0`).get().c;
console.log(`1. لم يتم سحبها ولم يتم فلترتها: ${s1.toLocaleString()}`);

// 2. مفلترة بدون وصف فقط (باقي البيانات موجودة)
const s2 = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE is_filtered = 1 AND filter_reason = 'no_overview'
  AND name_en IS NOT NULL AND poster_path IS NOT NULL 
  AND vote_average IS NOT NULL AND vote_average >= 4.0
`).get().c;
console.log(`2. مفلترة بدون وصف فقط (باقي البيانات موجودة): ${s2.toLocaleString()}`);

// 3. مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي)
const s3 = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE is_filtered = 1 AND overview_en IS NOT NULL AND overview_ar IS NULL
  AND name_en IS NOT NULL AND poster_path IS NOT NULL 
  AND vote_average IS NOT NULL AND vote_average >= 4.0
`).get().c;
console.log(`3. مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي): ${s3.toLocaleString()}`);

// 4. مفلترة بدون اسم عربي فقط (لديها اسم إنجليزي)
const s4 = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE is_filtered = 1 AND name_en IS NOT NULL AND name_ar IS NULL
  AND overview_ar IS NOT NULL AND poster_path IS NOT NULL 
  AND vote_average IS NOT NULL AND vote_average >= 4.0
`).get().c;
console.log(`4. مفلترة بدون اسم عربي فقط (لديها اسم إنجليزي): ${s4.toLocaleString()}`);

// 5. مفلترة بدون poster فقط (باقي البيانات موجودة)
const s5 = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE is_filtered = 1 AND filter_reason = 'no_poster'
  AND name_en IS NOT NULL AND overview_ar IS NOT NULL 
  AND vote_average IS NOT NULL AND vote_average >= 4.0
`).get().c;
console.log(`5. مفلترة بدون poster فقط (باقي البيانات موجودة): ${s5.toLocaleString()}`);

// 6. مفلترة بسبب تقييم منخفض فقط (باقي البيانات موجودة)
const s6 = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE is_filtered = 1 AND filter_reason = 'low_rating'
  AND name_en IS NOT NULL AND overview_ar IS NOT NULL AND poster_path IS NOT NULL
`).get().c;
console.log(`6. مفلترة بسبب تقييم منخفض فقط (باقي البيانات موجودة): ${s6.toLocaleString()}`);

console.log('\n' + '═'.repeat(80));
console.log('\n📊 الملخص:\n');
console.log(`🎬 الأفلام المحتملة للإنقاذ: ${(m2 + m3 + m4 + m6 + m7).toLocaleString()}`);
console.log(`📺 المسلسلات المحتملة للإنقاذ: ${(s2 + s3 + s4 + s5 + s6).toLocaleString()}`);
console.log(`\n⚠️ أفلام لم يتم سحبها ولم يتم فلترتها: ${m1.toLocaleString()}`);
console.log(`⚠️ مسلسلات لم يتم سحبها ولم يتم فلترتها: ${s1.toLocaleString()}`);

db.close();
