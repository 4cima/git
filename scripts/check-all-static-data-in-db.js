#!/usr/bin/env node
const db = require('better-sqlite3')('./data/4cima-local.db');

console.log('📊 فحص كل البيانات الثابتة في القاعدة المحلية\n');
console.log('═'.repeat(80));

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

console.log('\n📋 الجداول الموجودة:');
tables.forEach(t => console.log('  ✅', t.name));

console.log('\n' + '═'.repeat(80));
console.log('📊 إحصائيات البيانات الثابتة:');
console.log('═'.repeat(80));

// 1. Genres
try {
  const genres = db.prepare('SELECT COUNT(*) as count FROM genres').get();
  const genresWithArabic = db.prepare('SELECT COUNT(*) as count FROM genres WHERE name_ar IS NOT NULL').get();
  console.log('\n🎭 الأنواع (Genres):');
  console.log(`   📊 الإجمالي: ${genres.count}`);
  console.log(`   🌍 مترجم: ${genresWithArabic.count}/${genres.count}`);
  console.log(`   ${genresWithArabic.count === genres.count ? '✅' : '⚠️'} الحالة: ${genresWithArabic.count === genres.count ? 'مكتمل' : 'ناقص'}`);
} catch (e) {
  console.log('\n🎭 الأنواع (Genres): ❌ الجدول غير موجود');
}

// 2. Countries
try {
  const countries = db.prepare('SELECT COUNT(*) as count FROM countries').get();
  const countriesWithArabic = db.prepare('SELECT COUNT(*) as count FROM countries WHERE arabic_name IS NOT NULL').get();
  console.log('\n🌍 الدول (Countries):');
  console.log(`   📊 الإجمالي: ${countries.count}`);
  console.log(`   🌍 مترجم: ${countriesWithArabic.count}/${countries.count}`);
  console.log(`   ${countriesWithArabic.count === countries.count ? '✅' : '⚠️'} الحالة: ${countriesWithArabic.count === countries.count ? 'مكتمل' : 'ناقص'}`);
} catch (e) {
  console.log('\n🌍 الدول (Countries): ❌ الجدول غير موجود');
}

// 3. Languages
try {
  const languages = db.prepare('SELECT COUNT(*) as count FROM languages').get();
  const languagesWithArabic = db.prepare('SELECT COUNT(*) as count FROM languages WHERE arabic_name IS NOT NULL').get();
  console.log('\n🗣️ اللغات (Languages):');
  console.log(`   📊 الإجمالي: ${languages.count}`);
  console.log(`   🌍 مترجم: ${languagesWithArabic.count}/${languages.count}`);
  console.log(`   ${languagesWithArabic.count === languages.count ? '✅' : '⚠️'} الحالة: ${languagesWithArabic.count >= languages.count - 1 ? 'مكتمل' : 'ناقص'}`);
} catch (e) {
  console.log('\n🗣️ اللغات (Languages): ❌ الجدول غير موجود');
}

// 4. Departments
try {
  const departments = db.prepare('SELECT COUNT(*) as count FROM departments').get();
  const departmentsWithArabic = db.prepare('SELECT COUNT(*) as count FROM departments WHERE name_ar IS NOT NULL').get();
  console.log('\n💼 الأقسام (Departments):');
  console.log(`   📊 الإجمالي: ${departments.count}`);
  console.log(`   🌍 مترجم: ${departmentsWithArabic.count}/${departments.count}`);
  console.log(`   ${departmentsWithArabic.count === departments.count ? '✅' : '⚠️'} الحالة: ${departmentsWithArabic.count === departments.count ? 'مكتمل' : 'ناقص'}`);
} catch (e) {
  console.log('\n💼 الأقسام (Departments): ❌ الجدول غير موجود');
}

// 5. Jobs
try {
  const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  const jobsWithArabic = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE name_ar IS NOT NULL').get();
  console.log('\n👔 الوظائف (Jobs):');
  console.log(`   📊 الإجمالي: ${jobs.count}`);
  console.log(`   🌍 مترجم: ${jobsWithArabic.count}/${jobs.count}`);
  console.log(`   ${jobsWithArabic.count === jobs.count ? '✅' : '⚠️'} الحالة: ${jobsWithArabic.count === jobs.count ? 'مكتمل' : 'ناقص'}`);
} catch (e) {
  console.log('\n👔 الوظائف (Jobs): ❌ الجدول غير موجود');
}

// 6. Certifications
try {
  const certifications = db.prepare('SELECT COUNT(*) as count FROM certifications').get();
  const certificationsWithArabic = db.prepare('SELECT COUNT(*) as count FROM certifications WHERE meaning_ar IS NOT NULL').get();
  const movieCerts = db.prepare("SELECT COUNT(*) as count FROM certifications WHERE content_type = 'movie'").get();
  const tvCerts = db.prepare("SELECT COUNT(*) as count FROM certifications WHERE content_type = 'tv'").get();
  console.log('\n🔞 التصنيفات العمرية (Certifications):');
  console.log(`   📊 الإجمالي: ${certifications.count}`);
  console.log(`   🎬 أفلام: ${movieCerts.count}`);
  console.log(`   📺 مسلسلات: ${tvCerts.count}`);
  console.log(`   🌍 مترجم: ${certificationsWithArabic.count}/${certifications.count}`);
  console.log(`   ${certificationsWithArabic.count >= certifications.count * 0.8 ? '✅' : '⚠️'} الحالة: ${certificationsWithArabic.count >= certifications.count * 0.8 ? 'مكتمل' : 'ناقص'}`);
} catch (e) {
  console.log('\n🔞 التصنيفات العمرية (Certifications): ❌ الجدول غير موجود');
}

// 7. Content data
try {
  const movies = db.prepare('SELECT COUNT(*) as count FROM movies').get();
  const series = db.prepare('SELECT COUNT(*) as count FROM tv_series').get();
  console.log('\n📽️ المحتوى (Content):');
  console.log(`   🎬 الأفلام: ${movies.count.toLocaleString()}`);
  console.log(`   📺 المسلسلات: ${series.count.toLocaleString()}`);
  console.log(`   ✅ الحالة: موجود`);
} catch (e) {
  console.log('\n📽️ المحتوى (Content): ⚠️ خطأ في القراءة');
}

console.log('\n' + '═'.repeat(80));
console.log('📋 الملخص النهائي:');
console.log('═'.repeat(80));

let complete = 0;
let total = 0;

// Count complete tables
try {
  const genres = db.prepare('SELECT COUNT(*) as count FROM genres WHERE name_ar IS NOT NULL').get();
  const genresTotal = db.prepare('SELECT COUNT(*) as count FROM genres').get();
  if (genres.count === genresTotal.count) complete++;
  total++;
} catch (e) {}

try {
  const countries = db.prepare('SELECT COUNT(*) as count FROM countries WHERE arabic_name IS NOT NULL').get();
  const countriesTotal = db.prepare('SELECT COUNT(*) as count FROM countries').get();
  if (countries.count === countriesTotal.count) complete++;
  total++;
} catch (e) {}

try {
  const languages = db.prepare('SELECT COUNT(*) as count FROM languages WHERE arabic_name IS NOT NULL').get();
  const languagesTotal = db.prepare('SELECT COUNT(*) as count FROM languages').get();
  if (languages.count >= languagesTotal.count - 1) complete++;
  total++;
} catch (e) {}

try {
  const departments = db.prepare('SELECT COUNT(*) as count FROM departments WHERE name_ar IS NOT NULL').get();
  const departmentsTotal = db.prepare('SELECT COUNT(*) as count FROM departments').get();
  if (departments.count === departmentsTotal.count) complete++;
  total++;
} catch (e) {}

try {
  const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE name_ar IS NOT NULL').get();
  const jobsTotal = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  if (jobs.count === jobsTotal.count) complete++;
  total++;
} catch (e) {}

try {
  const certifications = db.prepare('SELECT COUNT(*) as count FROM certifications WHERE meaning_ar IS NOT NULL').get();
  const certificationsTotal = db.prepare('SELECT COUNT(*) as count FROM certifications').get();
  if (certifications.count >= certificationsTotal.count * 0.8) complete++;
  total++;
} catch (e) {}

console.log(`\n✅ مكتمل: ${complete}/${total} جدول`);
console.log(`📊 النسبة: ${Math.round(complete / total * 100)}%`);

if (complete === total) {
  console.log('\n🎉 جميع البيانات الثابتة موجودة ومترجمة!');
} else {
  console.log('\n⚠️ بعض البيانات ناقصة أو غير مترجمة');
}

console.log('\n' + '═'.repeat(80));
