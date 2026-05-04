#!/usr/bin/env node
/**
 * 🔍 التحقق الفعلي من البيانات بالأدلة الحقيقية
 */

const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db');

console.log('🔍 التحقق الفعلي من البيانات\n');
console.log('═'.repeat(120));

// ============ الأفلام ============
console.log('\n🎬 الأفلام:\n');

// 1. أفلام لم يتم سحبها ولم يتم فلترتها نهائياً
console.log('1️⃣ أفلام لم يتم سحبها ولم يتم فلترتها نهائياً:');
try {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM movies 
    WHERE overview_en IS NULL AND is_filtered = 0
  `).get();
  console.log(`   العدد: ${result.count.toLocaleString()}`);
  
  // عينة
  const sample = db.prepare(`
    SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, is_complete, is_filtered
    FROM movies 
    WHERE overview_en IS NULL AND is_filtered = 0
    LIMIT 3
  `).all();
  console.log(`   عينة:`);
  sample.forEach(m => {
    console.log(`      ID: ${m.id}, Title EN: ${m.title_en || 'NULL'}, Title AR: ${m.title_ar || 'NULL'}, Complete: ${m.is_complete}, Filtered: ${m.is_filtered}`);
  });
} catch (e) {
  console.log(`   ❌ خطأ: ${e.message}`);
}

// 2. أفلام مفلترة بدون وصف فقط (باقي البيانات موجودة وجيدة)
console.log('\n2️⃣ أفلام مفلترة بدون وصف فقط (باقي البيانات موجودة):');
try {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM movies 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_overview'
    AND title_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).get();
  console.log(`   العدد: ${result.count.toLocaleString()}`);
  
  // عينة
  const sample = db.prepare(`
    SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, vote_count, filter_reason
    FROM movies 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_overview'
    AND title_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
    LIMIT 3
  `).all();
  console.log(`   عينة:`);
  sample.forEach(m => {
    console.log(`      ID: ${m.id}, Title: ${m.title_en}, Rating: ${m.vote_average}, Votes: ${m.vote_count}, Reason: ${m.filter_reason}`);
  });
} catch (e) {
  console.log(`   ❌ خطأ: ${e.message}`);
}

// 3. أفلام مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي وبيانات أخرى)
console.log('\n3️⃣ أفلام مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي):');
try {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM movies 
    WHERE is_filtered = 1 
    AND overview_en IS NOT NULL
    AND overview_ar IS NULL
    AND title_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).get();
  console.log(`   العدد: ${result.count.toLocaleString()}`);
  
  // عينة
  const sample = db.prepare(`
    SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, filter_reason
    FROM movies 
    WHERE is_filtered = 1 
    AND overview_en IS NOT NULL
    AND overview_ar IS NULL
    AND title_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
    LIMIT 3
  `).all();
  console.log(`   عينة:`);
  sample.forEach(m => {
    console.log(`      ID: ${m.id}, Title EN: ${m.title_en}, Title AR: ${m.title_ar || 'NULL'}, Overview EN: ${m.overview_en ? 'موجود' : 'NULL'}, Overview AR: ${m.overview_ar || 'NULL'}`);
  });
} catch (e) {
  console.log(`   ❌ خطأ: ${e.message}`);
}

// 4. أفلام مفلترة بدون اسم عربي فقط (لديها اسم إنجليزي وبيانات أخرى)
console.log('\n4️⃣ أفلام مفلترة بدون اسم عربي فقط (لديها اسم إنجليزي):');
try {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM movies 
    WHERE is_filtered = 1 
    AND title_en IS NOT NULL
    AND title_ar IS NULL
    AND overview_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).get();
  console.log(`   العدد: ${result.count.toLocaleString()}`);
  
  // عينة
  const sample = db.prepare(`
    SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, filter_reason
    FROM movies 
    WHERE is_filtered = 1 
    AND title_en IS NOT NULL
    AND title_ar IS NULL
    AND overview_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
    LIMIT 3
  `).all();
  console.log(`   عينة:`);
  sample.forEach(m => {
    console.log(`      ID: ${m.id}, Title EN: ${m.title_en}, Title AR: ${m.title_ar || 'NULL'}, Overview EN: ${m.overview_en ? 'موجود' : 'NULL'}`);
  });
} catch (e) {
  console.log(`   ❌ خطأ: ${e.message}`);
}

// 5. أفلام مفلترة بدون poster فقط (باقي البيانات موجودة وجيدة)
console.log('\n5️⃣ أفلام مفلترة بدون poster فقط (باقي البيانات موجودة):');
try {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM movies 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_poster'
    AND title_en IS NOT NULL
    AND overview_en IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).get();
  console.log(`   العدد: ${result.count.toLocaleString()}`);
  
  // عينة
  const sample = db.prepare(`
    SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path, vote_average, filter_reason
    FROM movies 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_poster'
    AND title_en IS NOT NULL
    AND overview_en IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
    LIMIT 3
  `).all();
  console.log(`   عينة:`);
  sample.forEach(m => {
    console.log(`      ID: ${m.id}, Title: ${m.title_en}, Rating: ${m.vote_average}, Poster: ${m.poster_path || 'NULL'}`);
  });
} catch (e) {
  console.log(`   ❌ خطأ: ${e.message}`);
}

// ============ المسلسلات ============
console.log('\n\n📺 المسلسلات:\n');

// 1. مسلسلات لم يتم سحبها ولم يتم فلترتها نهائياً
console.log('1️⃣ مسلسلات لم يتم سحبها ولم يتم فلترتها نهائياً:');
try {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series 
    WHERE overview_ar IS NULL AND is_filtered = 0
  `).get();
  console.log(`   العدد: ${result.count.toLocaleString()}`);
  
  // عينة
  const sample = db.prepare(`
    SELECT id, name_en, name_ar, overview_ar, overview_en, poster_path, vote_average, is_complete, is_filtered
    FROM tv_series 
    WHERE overview_ar IS NULL AND is_filtered = 0
    LIMIT 3
  `).all();
  console.log(`   عينة:`);
  sample.forEach(s => {
    console.log(`      ID: ${s.id}, Name EN: ${s.name_en || 'NULL'}, Name AR: ${s.name_ar || 'NULL'}, Complete: ${s.is_complete}, Filtered: ${s.is_filtered}`);
  });
} catch (e) {
  console.log(`   ❌ خطأ: ${e.message}`);
}

// 2. مسلسلات مفلترة بدون وصف فقط (باقي البيانات موجودة)
console.log('\n2️⃣ مسلسلات مفلترة بدون وصف فقط (باقي البيانات موجودة):');
try {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_overview'
    AND name_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).get();
  console.log(`   العدد: ${result.count.toLocaleString()}`);
  
  // عينة
  const sample = db.prepare(`
    SELECT id, name_en, name_ar, overview_ar, overview_en, poster_path, vote_average, filter_reason
    FROM tv_series 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_overview'
    AND name_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
    LIMIT 3
  `).all();
  console.log(`   عينة:`);
  sample.forEach(s => {
    console.log(`      ID: ${s.id}, Name: ${s.name_en}, Rating: ${s.vote_average}, Reason: ${s.filter_reason}`);
  });
} catch (e) {
  console.log(`   ❌ خطأ: ${e.message}`);
}

// 3. مسلسلات مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي)
console.log('\n3️⃣ مسلسلات مفلترة بدون وصف عربي فقط (لديها وصف إنجليزي):');
try {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series 
    WHERE is_filtered = 1 
    AND overview_en IS NOT NULL
    AND overview_ar IS NULL
    AND name_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).get();
  console.log(`   العدد: ${result.count.toLocaleString()}`);
  
  // عينة
  const sample = db.prepare(`
    SELECT id, name_en, name_ar, overview_en, overview_ar, poster_path, vote_average, filter_reason
    FROM tv_series 
    WHERE is_filtered = 1 
    AND overview_en IS NOT NULL
    AND overview_ar IS NULL
    AND name_en IS NOT NULL
    AND poster_path IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
    LIMIT 3
  `).all();
  console.log(`   عينة:`);
  sample.forEach(s => {
    console.log(`      ID: ${s.id}, Name EN: ${s.name_en}, Name AR: ${s.name_ar || 'NULL'}, Overview EN: ${s.overview_en ? 'موجود' : 'NULL'}`);
  });
} catch (e) {
  console.log(`   ❌ خطأ: ${e.message}`);
}

// 4. مسلسلات مفلترة بدون poster فقط (باقي البيانات موجودة)
console.log('\n4️⃣ مسلسلات مفلترة بدون poster فقط (باقي البيانات موجودة):');
try {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_poster'
    AND name_en IS NOT NULL
    AND overview_ar IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
  `).get();
  console.log(`   العدد: ${result.count.toLocaleString()}`);
  
  // عينة
  const sample = db.prepare(`
    SELECT id, name_en, name_ar, overview_ar, overview_en, poster_path, vote_average, filter_reason
    FROM tv_series 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_poster'
    AND name_en IS NOT NULL
    AND overview_ar IS NOT NULL
    AND vote_average IS NOT NULL
    AND vote_average >= 4.0
    LIMIT 3
  `).all();
  console.log(`   عينة:`);
  sample.forEach(s => {
    console.log(`      ID: ${s.id}, Name: ${s.name_en}, Rating: ${s.vote_average}, Poster: ${s.poster_path || 'NULL'}`);
  });
} catch (e) {
  console.log(`   ❌ خطأ: ${e.message}`);
}

console.log('\n' + '═'.repeat(120));
db.close();
