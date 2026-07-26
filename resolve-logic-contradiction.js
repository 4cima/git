#!/usr/bin/env node
/**
 * 🚨 حل التناقض المنطقي: كيف دخلت الـ42 فيلم إلى Turso؟
 */

const fs = require('fs');
const path = require('path');
const db = require('./scripts/services/local-db');

console.log('=' .repeat(80));
console.log('🚨 حل التناقض المنطقي');
console.log('=' .repeat(80));

// 1. فحص mtime لملف content-filter.js
console.log('\n1️⃣  mtime لـ content-filter.js vs تاريخ البيانات:');
console.log('─'.repeat(80));

const filterPath = path.join(__dirname, 'scripts', 'services', 'content-filter.js');
const filterStats = fs.statSync(filterPath);

console.log(`\n📁 ${filterPath}`);
console.log(`📅 mtime: ${filterStats.mtime.toISOString()}`);
console.log(`📅 birthtime: ${filterStats.birthtime.toISOString()}`);

const dataDate = new Date('2026-07-24T23:53:00Z');
const filterDate = new Date(filterStats.mtime);

console.log(`\n📊 المقارنة:`);
console.log(`   • تاريخ البيانات: 2026-07-24 23:53:00 UTC`);
console.log(`   • mtime الفلتر: ${filterStats.mtime.toISOString()}`);

if (filterDate <= dataDate) {
  console.log(`   ✅ الفلتر تم تعديله قبل أو في نفس وقت كتابة البيانات`);
  console.log(`   → الفلتر الحالي هو نفسه (أو أحدث من) الذي استُخدم`);
} else {
  const daysDiff = Math.round((filterDate - dataDate) / (1000 * 60 * 60 * 24));
  console.log(`   ⚠️  الفلتر تم تعديله بعد كتابة البيانات بـ ${daysDiff} يوم`);
  console.log(`   → الفلتر الحالي مختلف عن الذي استُخدم وقت الكتابة`);
}

// 2. فحص الـ42 فيلم في local.db
console.log('\n' + '='.repeat(80));
console.log('2️⃣  فحص الـ42 فيلم في local.db:');
console.log('─'.repeat(80));

const flaggedMovies = [
  5, 14, 24, 25, 28, 33, 59, 63, 65, 73,
  76, 77, 78, 82, 83, 90, 91, 96, 98, 100,
  101, 103, 106, 107, 108, 109, 110, 111, 113, 114,
  115, 116, 117, 121, 128, 141, 142, 145, 149, 150,
  155, 158
];

console.log(`\n🔍 فحص ${flaggedMovies.length} فيلم من القائمة المفلترة...\n`);

const placeholders = flaggedMovies.map(() => '?').join(',');
const query = `
  SELECT tmdb_id, title_en, is_filtered, is_complete, filter_reason, synced_to_turso
  FROM movies 
  WHERE tmdb_id IN (${placeholders})
  ORDER BY tmdb_id
`;

const results = db.prepare(query).all(...flaggedMovies);

let countFiltered = 0;
let countNotFiltered = 0;
let countNotFound = 0;

const filtered = [];
const notFiltered = [];

for (const tmdbId of flaggedMovies) {
  const row = results.find(r => r.tmdb_id === tmdbId);
  
  if (!row) {
    countNotFound++;
    console.log(`❓ [${tmdbId}] غير موجود في local.db`);
  } else if (row.is_filtered === 1) {
    countFiltered++;
    filtered.push(row);
    console.log(`🚫 [${tmdbId}] ${row.title_en}`);
    console.log(`   is_filtered=1, filter_reason="${row.filter_reason || 'NULL'}"`);
  } else {
    countNotFiltered++;
    notFiltered.push(row);
    console.log(`✅ [${tmdbId}] ${row.title_en}`);
    console.log(`   is_filtered=0, synced_to_turso=${row.synced_to_turso}`);
  }
}

console.log('\n📊 الملخص:');
console.log(`   is_filtered=1: ${countFiltered} فيلم`);
console.log(`   is_filtered=0: ${countNotFiltered} فيلم`);
console.log(`   غير موجود: ${countNotFound} فيلم`);

if (countNotFiltered > 0) {
  console.log('\n🚨 CRITICAL: هؤلاء موجودون في Turso رغم is_filtered=0 في local.db:');
  notFiltered.slice(0, 10).forEach(m => {
    console.log(`   • [${m.tmdb_id}] ${m.title_en}`);
  });
  if (notFiltered.length > 10) {
    console.log(`   ... و ${notFiltered.length - 10} آخرين`);
  }
}

// 3. فحص schema local.db
console.log('\n' + '='.repeat(80));
console.log('3️⃣  فحص schema local.db (البحث عن أعمدة تتبع المصدر):');
console.log('─'.repeat(80));

const schema = db.prepare('PRAGMA table_info(movies)').all();

console.log(`\n📋 أعمدة جدول movies في local.db (${schema.length} عمود):\n`);

const trackingColumns = [];
schema.forEach(col => {
  const isTracking = /source|batch|import|script|origin|created_by/i.test(col.name);
  if (isTracking) {
    trackingColumns.push(col.name);
    console.log(`   🔍 ${col.name.padEnd(30)} (${col.type}) ← عمود تتبع محتمل`);
  } else if (['created_at', 'updated_at', 'synced_at', 'synced_to_turso'].includes(col.name)) {
    console.log(`   📅 ${col.name.padEnd(30)} (${col.type})`);
  }
});

if (trackingColumns.length === 0) {
  console.log('\n❌ لا توجد أعمدة واضحة لتتبع المصدر في السكيما');
} else {
  console.log(`\n✅ تم العثور على ${trackingColumns.length} عمود تتبع محتمل`);
}

// فحص الأعمدة الكاملة للسكيما
console.log('\n📋 السكيما الكاملة (أول 30 عمود):');
schema.slice(0, 30).forEach((col, i) => {
  console.log(`   ${String(i + 1).padStart(2, ' ')}. ${col.name.padEnd(25)} ${col.type.padEnd(10)} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
});

if (schema.length > 30) {
  console.log(`   ... و ${schema.length - 30} عمود آخر`);
}

// 4. فحص إضافي: تواريخ created_at في local.db
console.log('\n' + '='.repeat(80));
console.log('4️⃣  فحص تواريخ created_at للـ42 فيلم في local.db:');
console.log('─'.repeat(80));

if (results.length > 0) {
  // نحتاج created_at
  const datesQuery = `
    SELECT tmdb_id, title_en, created_at, updated_at
    FROM movies 
    WHERE tmdb_id IN (${placeholders})
    ORDER BY created_at
    LIMIT 10
  `;
  
  const dates = db.prepare(datesQuery).all(...flaggedMovies);
  
  console.log('\n📅 أول 10 أفلام حسب created_at:');
  dates.forEach(row => {
    console.log(`   [${row.tmdb_id}] ${row.title_en}`);
    console.log(`      created_at: ${row.created_at || 'NULL'}`);
    console.log(`      updated_at: ${row.updated_at || 'NULL'}`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('🔍 التحليل النهائي:');
console.log('=' .repeat(80));

console.log('\nالسيناريوهات المحتملة:');
console.log('');
console.log('إذا كان countNotFiltered > 0 (is_filtered=0 في local.db):');
console.log('  → الفلتر الحالي مختلف عن وقت الكتابة');
console.log('  → الـ42 فيلم كانوا "نظاف" بمعايير الفلتر القديم');
console.log('  → الفلتر الجديد أكثر صرامة');
console.log('');
console.log('إذا كان countFiltered > 0 (is_filtered=1 في local.db):');
console.log('  → الفلتر فلترهم صح، لكن دخلوا Turso من مسار آخر');
console.log('  → ultra-fast قد يكون تجاهل is_filtered في نسخة قديمة');
console.log('  → أو كان فيه سكريبت رابع مش معروف');
console.log('');
console.log('إذا كان countNotFound > 0:');
console.log('  → local.db تم مسحها أو تعديلها بعد المزامنة');
console.log('  → البيانات في Turso يتامى (orphaned)');
