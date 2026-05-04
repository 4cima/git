const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db');

console.log('🔍 تحليل الحالات الحدية والخاصة\n');
console.log('═'.repeat(120));

// ============ الأفلام ============
console.log('\n🎬 تحليل الأفلام:\n');

// 1. أفلام لم يتم سحبها ولم يتم فلترتها
console.log('1️⃣ أفلام لم يتم سحبها ولم يتم فلترتها (غير مسحوبة وغير مفلترة):');
const moviesNotFetchedNotFiltered = db.prepare(`
  SELECT COUNT(*) as count FROM movies 
  WHERE overview_en IS NULL 
  AND is_filtered = 0
`).get();
console.log(`   📊 العدد: ${moviesNotFetchedNotFiltered.count.toLocaleString()}`);

// عينة من هذه الأفلام
const moviesNotFetchedSample = db.prepare(`
  SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, is_complete, is_filtered
  FROM movies 
  WHERE overview_en IS NULL 
  AND is_filtered = 0
  LIMIT 5
`).all();
console.log(`   📋 عينة:`);
moviesNotFetchedSample.forEach(m => {
  console.log(`      - ID: ${m.id}, Title EN: ${m.title_en}, Title AR: ${m.title_ar}, Complete: ${m.is_complete}, Filtered: ${m.is_filtered}`);
});

// 2. أفلام مفلترة بسبب بدون وصف فقط (لكن باقي البيانات موجودة)
console.log('\n2️⃣ أفلام مفلترة بسبب بدون وصف فقط (لكن باقي البيانات موجودة):');
const moviesFilteredNoOverviewOnly = db.prepare(`
  SELECT COUNT(*) as count FROM movies 
  WHERE is_filtered = 1
  AND filter_reason = 'no_overview'
  AND title_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
`).get();
console.log(`   📊 العدد: ${moviesFilteredNoOverviewOnly.count.toLocaleString()}`);

// عينة
const moviesFilteredNoOverviewSample = db.prepare(`
  SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, vote_count, keywords
  FROM movies 
  WHERE is_filtered = 1
  AND filter_reason = 'no_overview'
  AND title_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
  LIMIT 5
`).all();
console.log(`   📋 عينة:`);
moviesFilteredNoOverviewSample.forEach(m => {
  console.log(`      - ID: ${m.id}, Title: ${m.title_en}, Rating: ${m.vote_average}, Votes: ${m.vote_count}, Keywords: ${m.keywords ? 'موجود' : 'غير موجود'}`);
});

// 3. أفلام مفلترة بدون وصف عربي فقط (لكن لديها وصف إنجليزي وبيانات أخرى)
console.log('\n3️⃣ أفلام مفلترة بدون وصف عربي فقط (لكن لديها وصف إنجليزي):');
const moviesNoArabicOverviewOnly = db.prepare(`
  SELECT COUNT(*) as count FROM movies 
  WHERE is_filtered = 1
  AND overview_en IS NOT NULL
  AND overview_ar IS NULL
  AND title_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
`).get();
console.log(`   📊 العدد: ${moviesNoArabicOverviewOnly.count.toLocaleString()}`);

// عينة
const moviesNoArabicOverviewSample = db.prepare(`
  SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, vote_count
  FROM movies 
  WHERE is_filtered = 1
  AND overview_en IS NOT NULL
  AND overview_ar IS NULL
  AND title_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
  LIMIT 5
`).all();
console.log(`   📋 عينة:`);
moviesNoArabicOverviewSample.forEach(m => {
  console.log(`      - ID: ${m.id}, Title EN: ${m.title_en}, Title AR: ${m.title_ar || 'غير موجود'}, Overview EN: ${m.overview_en ? 'موجود' : 'غير موجود'}, Overview AR: ${m.overview_ar ? 'موجود' : 'غير موجود'}`);
});

// 4. أفلام مفلترة بدون اسم عربي فقط (لكن لديها اسم إنجليزي وبيانات أخرى)
console.log('\n4️⃣ أفلام مفلترة بدون اسم عربي فقط (لكن لديها اسم إنجليزي):');
const moviesNoArabicTitleOnly = db.prepare(`
  SELECT COUNT(*) as count FROM movies 
  WHERE is_filtered = 1
  AND title_en IS NOT NULL
  AND title_ar IS NULL
  AND overview_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
`).get();
console.log(`   📊 العدد: ${moviesNoArabicTitleOnly.count.toLocaleString()}`);

// عينة
const moviesNoArabicTitleSample = db.prepare(`
  SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, vote_count
  FROM movies 
  WHERE is_filtered = 1
  AND title_en IS NOT NULL
  AND title_ar IS NULL
  AND overview_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
  LIMIT 5
`).all();
console.log(`   📋 عينة:`);
moviesNoArabicTitleSample.forEach(m => {
  console.log(`      - ID: ${m.id}, Title EN: ${m.title_en}, Title AR: ${m.title_ar || 'غير موجود'}, Overview EN: ${m.overview_en ? 'موجود' : 'غير موجود'}`);
});

// 5. أفلام مفلترة بدون اسم إنجليزي (حالة نادرة جداً)
console.log('\n5️⃣ أفلام مفلترة بدون اسم إنجليزي (حالة نادرة):');
const moviesNoEnglishTitle = db.prepare(`
  SELECT COUNT(*) as count FROM movies 
  WHERE is_filtered = 1
  AND title_en IS NULL
`).get();
console.log(`   📊 العدد: ${moviesNoEnglishTitle.count.toLocaleString()}`);

// 6. أفلام مفلترة بسبب بدون poster فقط (لكن باقي البيانات موجودة وجيدة)
console.log('\n6️⃣ أفلام مفلترة بسبب بدون poster فقط (لكن باقي البيانات موجودة):');
const moviesFilteredNoPosterOnly = db.prepare(`
  SELECT COUNT(*) as count FROM movies 
  WHERE is_filtered = 1
  AND filter_reason = 'no_poster'
  AND title_en IS NOT NULL
  AND overview_en IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
`).get();
console.log(`   📊 العدد: ${moviesFilteredNoPosterOnly.count.toLocaleString()}`);

// عينة
const moviesFilteredNoPosterSample = db.prepare(`
  SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, vote_count
  FROM movies 
  WHERE is_filtered = 1
  AND filter_reason = 'no_poster'
  AND title_en IS NOT NULL
  AND overview_en IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
  LIMIT 5
`).all();
console.log(`   📋 عينة:`);
moviesFilteredNoPosterSample.forEach(m => {
  console.log(`      - ID: ${m.id}, Title: ${m.title_en}, Rating: ${m.vote_average}, Votes: ${m.vote_count}, Poster: ${m.poster_path ? 'موجود' : 'غير موجود'}`);
});

// ============ المسلسلات ============
console.log('\n\n📺 تحليل المسلسلات:\n');

// 1. مسلسلات لم يتم سحبها ولم يتم فلترتها
console.log('1️⃣ مسلسلات لم يتم سحبها ولم يتم فلترتها:');
const seriesNotFetchedNotFiltered = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series 
  WHERE overview_ar IS NULL 
  AND is_filtered = 0
`).get();
console.log(`   📊 العدد: ${seriesNotFetchedNotFiltered.count.toLocaleString()}`);

// عينة
const seriesNotFetchedSample = db.prepare(`
  SELECT id, name_en, name_ar, overview_ar, overview_en, poster_path, vote_average, is_complete, is_filtered
  FROM tv_series 
  WHERE overview_ar IS NULL 
  AND is_filtered = 0
  LIMIT 5
`).all();
console.log(`   📋 عينة:`);
seriesNotFetchedSample.forEach(s => {
  console.log(`      - ID: ${s.id}, Name EN: ${s.name_en}, Name AR: ${s.name_ar}, Complete: ${s.is_complete}, Filtered: ${s.is_filtered}`);
});

// 2. مسلسلات مفلترة بسبب بدون وصف فقط (لكن باقي البيانات موجودة)
console.log('\n2️⃣ مسلسلات مفلترة بسبب بدون وصف فقط (لكن باقي البيانات موجودة):');
const seriesFilteredNoOverviewOnly = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series 
  WHERE is_filtered = 1
  AND filter_reason = 'no_overview'
  AND name_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
`).get();
console.log(`   📊 العدد: ${seriesFilteredNoOverviewOnly.count.toLocaleString()}`);

// عينة
const seriesFilteredNoOverviewSample = db.prepare(`
  SELECT id, name_en, name_ar, overview_ar, overview_en, poster_path, vote_average, vote_count
  FROM tv_series 
  WHERE is_filtered = 1
  AND filter_reason = 'no_overview'
  AND name_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
  LIMIT 5
`).all();
console.log(`   📋 عينة:`);
seriesFilteredNoOverviewSample.forEach(s => {
  console.log(`      - ID: ${s.id}, Name: ${s.name_en}, Rating: ${s.vote_average}, Votes: ${s.vote_count}`);
});

// 3. مسلسلات مفلترة بدون وصف عربي فقط (لكن لديها وصف إنجليزي)
console.log('\n3️⃣ مسلسلات مفلترة بدون وصف عربي فقط (لكن لديها وصف إنجليزي):');
const seriesNoArabicOverviewOnly = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series 
  WHERE is_filtered = 1
  AND overview_en IS NOT NULL
  AND overview_ar IS NULL
  AND name_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
`).get();
console.log(`   📊 العدد: ${seriesNoArabicOverviewOnly.count.toLocaleString()}`);

// عينة
const seriesNoArabicOverviewSample = db.prepare(`
  SELECT id, name_en, name_ar, overview_en, overview_ar, poster_path, vote_average, vote_count
  FROM tv_series 
  WHERE is_filtered = 1
  AND overview_en IS NOT NULL
  AND overview_ar IS NULL
  AND name_en IS NOT NULL
  AND poster_path IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
  LIMIT 5
`).all();
console.log(`   📋 عينة:`);
seriesNoArabicOverviewSample.forEach(s => {
  console.log(`      - ID: ${s.id}, Name EN: ${s.name_en}, Name AR: ${s.name_ar || 'غير موجود'}, Overview EN: ${s.overview_en ? 'موجود' : 'غير موجود'}`);
});

// 4. مسلسلات مفلترة بسبب بدون poster فقط (لكن باقي البيانات موجودة)
console.log('\n4️⃣ مسلسلات مفلترة بسبب بدون poster فقط (لكن باقي البيانات موجودة):');
const seriesFilteredNoPosterOnly = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series 
  WHERE is_filtered = 1
  AND filter_reason = 'no_poster'
  AND name_en IS NOT NULL
  AND overview_ar IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
`).get();
console.log(`   📊 العدد: ${seriesFilteredNoPosterOnly.count.toLocaleString()}`);

// عينة
const seriesFilteredNoPosterSample = db.prepare(`
  SELECT id, name_en, name_ar, overview_ar, overview_en, poster_path, vote_average, vote_count
  FROM tv_series 
  WHERE is_filtered = 1
  AND filter_reason = 'no_poster'
  AND name_en IS NOT NULL
  AND overview_ar IS NOT NULL
  AND vote_average IS NOT NULL
  AND vote_average >= 4.0
  LIMIT 5
`).all();
console.log(`   📋 عينة:`);
seriesFilteredNoPosterSample.forEach(s => {
  console.log(`      - ID: ${s.id}, Name: ${s.name_en}, Rating: ${s.vote_average}, Votes: ${s.vote_count}`);
});

// ============ الملخص ============
console.log('\n\n' + '═'.repeat(120));
console.log('📊 الملخص:\n');

console.log('🎬 الأفلام:');
console.log(`  1. لم يتم سحبها ولم يتم فلترتها: ${moviesNotFetchedNotFiltered.count.toLocaleString()}`);
console.log(`  2. مفلترة بدون وصف فقط (باقي البيانات موجودة): ${moviesFilteredNoOverviewOnly.count.toLocaleString()}`);
console.log(`  3. مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي): ${moviesNoArabicOverviewOnly.count.toLocaleString()}`);
console.log(`  4. مفلترة بدون اسم عربي فقط (لديها اسم إنجليزي): ${moviesNoArabicTitleOnly.count.toLocaleString()}`);
console.log(`  5. مفلترة بدون اسم إنجليزي: ${moviesNoEnglishTitle.count.toLocaleString()}`);
console.log(`  6. مفلترة بدون poster فقط (باقي البيانات موجودة): ${moviesFilteredNoPosterOnly.count.toLocaleString()}`);

console.log('\n📺 المسلسلات:');
console.log(`  1. لم يتم سحبها ولم يتم فلترتها: ${seriesNotFetchedNotFiltered.count.toLocaleString()}`);
console.log(`  2. مفلترة بدون وصف فقط (باقي البيانات موجودة): ${seriesFilteredNoOverviewOnly.count.toLocaleString()}`);
console.log(`  3. مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي): ${seriesNoArabicOverviewOnly.count.toLocaleString()}`);
console.log(`  4. مفلترة بدون poster فقط (باقي البيانات موجودة): ${seriesFilteredNoPosterOnly.count.toLocaleString()}`);

db.close();
