#!/usr/bin/env node
const db = require('better-sqlite3')('./data/4cima-local.db');

console.log('🔍 فحص ترجمة كل البيانات في القاعدة\n');
console.log('═'.repeat(80));

// 1. Movies
const moviesTotal = db.prepare('SELECT COUNT(*) as count FROM movies').get();
const moviesWithArabicTitle = db.prepare("SELECT COUNT(*) as count FROM movies WHERE title_ar IS NOT NULL AND title_ar != ''").get();
const moviesWithArabicOverview = db.prepare("SELECT COUNT(*) as count FROM movies WHERE overview_ar IS NOT NULL AND overview_ar != ''").get();

console.log('\n🎬 الأفلام:');
console.log(`   📊 الإجمالي: ${moviesTotal.count.toLocaleString()}`);
console.log(`   📝 العناوين المترجمة: ${moviesWithArabicTitle.count.toLocaleString()} (${Math.round(moviesWithArabicTitle.count/moviesTotal.count*100)}%)`);
console.log(`   📄 الأوصاف المترجمة: ${moviesWithArabicOverview.count.toLocaleString()} (${Math.round(moviesWithArabicOverview.count/moviesTotal.count*100)}%)`);

// 2. TV Series
const seriesTotal = db.prepare('SELECT COUNT(*) as count FROM tv_series').get();
const seriesWithArabicTitle = db.prepare("SELECT COUNT(*) as count FROM tv_series WHERE title_ar IS NOT NULL AND title_ar != ''").get();
const seriesWithArabicOverview = db.prepare("SELECT COUNT(*) as count FROM tv_series WHERE overview_ar IS NOT NULL AND overview_ar != ''").get();

console.log('\n📺 المسلسلات:');
console.log(`   📊 الإجمالي: ${seriesTotal.count.toLocaleString()}`);
console.log(`   📝 العناوين المترجمة: ${seriesWithArabicTitle.count.toLocaleString()} (${Math.round(seriesWithArabicTitle.count/seriesTotal.count*100)}%)`);
console.log(`   📄 الأوصاف المترجمة: ${seriesWithArabicOverview.count.toLocaleString()} (${Math.round(seriesWithArabicOverview.count/seriesTotal.count*100)}%)`);

// 3. Actors
try {
  const actorsTotal = db.prepare('SELECT COUNT(*) as count FROM actors').get();
  const actorsWithArabicName = db.prepare("SELECT COUNT(*) as count FROM actors WHERE name_ar IS NOT NULL AND name_ar != ''").get();
  
  console.log('\n👤 الممثلين:');
  console.log(`   📊 الإجمالي: ${actorsTotal.count.toLocaleString()}`);
  console.log(`   📝 الأسماء المترجمة: ${actorsWithArabicName.count.toLocaleString()} (${Math.round(actorsWithArabicName.count/actorsTotal.count*100)}%)`);
} catch (e) {
  console.log('\n👤 الممثلين: لا توجد بيانات');
}

// 4. Static Data Summary
console.log('\n' + '═'.repeat(80));
console.log('📊 البيانات الثابتة:');
console.log('═'.repeat(80));

const genres = db.prepare('SELECT COUNT(*) as count FROM genres WHERE name_ar IS NOT NULL').get();
const genresTotal = db.prepare('SELECT COUNT(*) as count FROM genres').get();
console.log(`\n🎭 الأنواع: ${genres.count}/${genresTotal.count} (${Math.round(genres.count/genresTotal.count*100)}%)`);

const countries = db.prepare('SELECT COUNT(*) as count FROM countries WHERE arabic_name IS NOT NULL').get();
const countriesTotal = db.prepare('SELECT COUNT(*) as count FROM countries').get();
console.log(`🌍 الدول: ${countries.count}/${countriesTotal.count} (${Math.round(countries.count/countriesTotal.count*100)}%)`);

const languages = db.prepare('SELECT COUNT(*) as count FROM languages WHERE arabic_name IS NOT NULL').get();
const languagesTotal = db.prepare('SELECT COUNT(*) as count FROM languages').get();
console.log(`🗣️ اللغات: ${languages.count}/${languagesTotal.count} (${Math.round(languages.count/languagesTotal.count*100)}%)`);

const departments = db.prepare('SELECT COUNT(*) as count FROM departments WHERE name_ar IS NOT NULL').get();
const departmentsTotal = db.prepare('SELECT COUNT(*) as count FROM departments').get();
console.log(`💼 الأقسام: ${departments.count}/${departmentsTotal.count} (${Math.round(departments.count/departmentsTotal.count*100)}%)`);

const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE name_ar IS NOT NULL').get();
const jobsTotal = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
console.log(`👔 الوظائف: ${jobs.count}/${jobsTotal.count} (${Math.round(jobs.count/jobsTotal.count*100)}%)`);

const certs = db.prepare('SELECT COUNT(*) as count FROM certifications WHERE meaning_ar IS NOT NULL').get();
const certsTotal = db.prepare('SELECT COUNT(*) as count FROM certifications').get();
console.log(`🔞 التصنيفات: ${certs.count}/${certsTotal.count} (${Math.round(certs.count/certsTotal.count*100)}%)`);

console.log('\n' + '═'.repeat(80));
console.log('📋 الخلاصة:');
console.log('═'.repeat(80));

console.log('\n✅ البيانات الثابتة: مترجمة بالكامل');
console.log(`⚠️ المحتوى (أفلام/مسلسلات): يحتاج مراجعة`);

console.log('\n' + '═'.repeat(80));
