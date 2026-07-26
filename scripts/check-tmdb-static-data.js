#!/usr/bin/env node
/**
 * ============================================
 * 🔍 فحص البيانات الثابتة من TMDB
 * ============================================
 * Purpose: Get all static data from TMDB and compare with local DB
 * ============================================
 */

const axios = require('axios');
const db = require('./services/local-db');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// ============================================
// FETCH FROM TMDB
// ============================================
async function fetchFromTMDB(endpoint) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: { api_key: TMDB_API_KEY },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error(`❌ خطأ في جلب ${endpoint}:`, error.message);
    return null;
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('🔍 فحص البيانات الثابتة من TMDB\n');
  console.log('═'.repeat(80));

  try {
    // 1. Movie Genres
    console.log('\n📊 1. أنواع الأفلام (Movie Genres)');
    console.log('─'.repeat(80));
    const movieGenres = await fetchFromTMDB('/genre/movie/list');
    if (movieGenres) {
      console.log(`   🌐 TMDB: ${movieGenres.genres.length} نوع`);
      console.log('   📋 الأنواع:');
      movieGenres.genres.forEach(g => {
        console.log(`      - ${g.id}: ${g.name}`);
      });
    }

    // 2. TV Genres
    console.log('\n📊 2. أنواع المسلسلات (TV Genres)');
    console.log('─'.repeat(80));
    const tvGenres = await fetchFromTMDB('/genre/tv/list');
    if (tvGenres) {
      console.log(`   🌐 TMDB: ${tvGenres.genres.length} نوع`);
      console.log('   📋 الأنواع:');
      tvGenres.genres.forEach(g => {
        console.log(`      - ${g.id}: ${g.name}`);
      });
    }

    // 3. Languages
    console.log('\n📊 3. اللغات (Languages)');
    console.log('─'.repeat(80));
    const languages = await fetchFromTMDB('/configuration/languages');
    if (languages) {
      console.log(`   🌐 TMDB: ${languages.length} لغة`);
      console.log('   📋 عينة من اللغات:');
      languages.slice(0, 20).forEach(l => {
        console.log(`      - ${l.iso_639_1}: ${l.english_name}${l.name ? ` (${l.name})` : ''}`);
      });
      console.log(`      ... و ${languages.length - 20} لغة أخرى`);
    }

    // 4. Countries
    console.log('\n📊 4. الدول (Countries)');
    console.log('─'.repeat(80));
    const countries = await fetchFromTMDB('/configuration/countries');
    if (countries) {
      console.log(`   🌐 TMDB: ${countries.length} دولة`);
      console.log('   📋 عينة من الدول:');
      countries.slice(0, 20).forEach(c => {
        console.log(`      - ${c.iso_3166_1}: ${c.english_name}${c.native_name ? ` (${c.native_name})` : ''}`);
      });
      console.log(`      ... و ${countries.length - 20} دولة أخرى`);
    }

    // 5. Timezones
    console.log('\n📊 5. المناطق الزمنية (Timezones)');
    console.log('─'.repeat(80));
    const timezones = await fetchFromTMDB('/configuration/timezones');
    if (timezones) {
      console.log(`   🌐 TMDB: ${timezones.length} منطقة زمنية`);
      console.log('   📋 عينة:');
      timezones.slice(0, 10).forEach(tz => {
        console.log(`      - ${tz.iso_3166_1}: ${tz.zones ? tz.zones.join(', ') : 'N/A'}`);
      });
    }

    // 6. Jobs (Crew Departments)
    console.log('\n📊 6. الوظائف (Jobs/Departments)');
    console.log('─'.repeat(80));
    const jobs = await fetchFromTMDB('/configuration/jobs');
    if (jobs) {
      console.log(`   🌐 TMDB: ${jobs.length} قسم`);
      jobs.forEach(dept => {
        console.log(`   📁 ${dept.department}: ${dept.jobs.length} وظيفة`);
        console.log(`      ${dept.jobs.slice(0, 5).join(', ')}${dept.jobs.length > 5 ? '...' : ''}`);
      });
    }

    // 7. Primary Translations
    console.log('\n📊 7. اللغات المدعومة للترجمة (Primary Translations)');
    console.log('─'.repeat(80));
    const translations = await fetchFromTMDB('/configuration/primary_translations');
    if (translations) {
      console.log(`   🌐 TMDB: ${translations.length} لغة مدعومة`);
      console.log(`   📋 اللغات: ${translations.join(', ')}`);
    }

    // ============================================
    // COMPARE WITH LOCAL DB
    // ============================================
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 مقارنة مع قاعدة البيانات المحلية');
    console.log('═'.repeat(80));

    // Genres
    const localGenres = db.prepare('SELECT COUNT(*) as count FROM genres').get();
    const totalTMDBGenres = (movieGenres?.genres.length || 0) + (tvGenres?.genres.length || 0);
    console.log('\n🎭 الأنواع (Genres):');
    console.log(`   🌐 TMDB: ${totalTMDBGenres} نوع (${movieGenres?.genres.length || 0} أفلام + ${tvGenres?.genres.length || 0} مسلسلات)`);
    console.log(`   💾 محلي: ${localGenres.count} نوع`);
    console.log(`   ${localGenres.count >= totalTMDBGenres ? '✅' : '⚠️'} الفرق: ${localGenres.count - totalTMDBGenres}`);

    // Countries
    const localCountries = db.prepare('SELECT COUNT(*) as count FROM countries').get();
    console.log('\n🌍 الدول (Countries):');
    console.log(`   🌐 TMDB: ${countries?.length || 0} دولة`);
    console.log(`   💾 محلي: ${localCountries.count} دولة`);
    console.log(`   ${localCountries.count >= (countries?.length || 0) ? '✅' : '⚠️'} الفرق: ${localCountries.count - (countries?.length || 0)}`);

    // Languages
    const localLanguages = db.prepare('SELECT COUNT(*) as count FROM languages').get();
    console.log('\n🗣️ اللغات (Languages):');
    console.log(`   🌐 TMDB: ${languages?.length || 0} لغة`);
    console.log(`   💾 محلي: ${localLanguages.count} لغة`);
    console.log(`   ${localLanguages.count >= (languages?.length || 0) ? '✅' : '⚠️'} الفرق: ${localLanguages.count - (languages?.length || 0)}`);

    // ============================================
    // COMPARE WITH SCRIPT FILE
    // ============================================
    console.log('\n\n' + '═'.repeat(80));
    console.log('📄 مقارنة مع ملف السكريبت (1-add-static-data-to-turso.js)');
    console.log('═'.repeat(80));

    const scriptPath = require('path').join(__dirname, '1-add-static-data-to-turso.js');
    const scriptContent = require('fs').readFileSync(scriptPath, 'utf8');
    
    // Count items in script
    const genresInScript = (scriptContent.match(/{ id: \d+, tmdb_id: \d+, name_en:/g) || []).length;
    const countriesInScript = (scriptContent.match(/{ iso_3166_1: '[A-Z]{2}', english_name:/g) || []).length;
    const languagesInScript = (scriptContent.match(/{ iso_639_1: '[a-z]{2}', english_name:/g) || []).length;

    console.log('\n🎭 الأنواع:');
    console.log(`   📄 في السكريبت: ${genresInScript} نوع`);
    console.log(`   🌐 في TMDB: ${totalTMDBGenres} نوع`);
    console.log(`   💾 في القاعدة: ${localGenres.count} نوع`);

    console.log('\n🌍 الدول:');
    console.log(`   📄 في السكريبت: ${countriesInScript} دولة`);
    console.log(`   🌐 في TMDB: ${countries?.length || 0} دولة`);
    console.log(`   💾 في القاعدة: ${localCountries.count} دولة`);

    console.log('\n🗣️ اللغات:');
    console.log(`   📄 في السكريبت: ${languagesInScript} لغة`);
    console.log(`   🌐 في TMDB: ${languages?.length || 0} لغة`);
    console.log(`   💾 في القاعدة: ${localLanguages.count} لغة`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 الملخص النهائي');
    console.log('═'.repeat(80));

    console.log('\n✅ البيانات الثابتة المتاحة من TMDB:');
    console.log('   1. Movie Genres (أنواع الأفلام)');
    console.log('   2. TV Genres (أنواع المسلسلات)');
    console.log('   3. Languages (اللغات)');
    console.log('   4. Countries (الدول)');
    console.log('   5. Timezones (المناطق الزمنية)');
    console.log('   6. Jobs/Departments (الوظائف/الأقسام)');
    console.log('   7. Primary Translations (اللغات المدعومة)');

    console.log('\n📋 البيانات الموجودة لدينا:');
    console.log('   ✅ Genres (الأنواع)');
    console.log('   ✅ Countries (الدول)');
    console.log('   ✅ Languages (اللغات)');

    console.log('\n⚠️ البيانات الثابتة المفقودة:');
    console.log('   ❌ Timezones (المناطق الزمنية) - غير مستخدمة عادة');
    console.log('   ❌ Jobs/Departments (الوظائف) - يمكن إضافتها للـ crew');
    console.log('   ❌ Primary Translations (اللغات المدعومة) - للترجمات فقط');

    console.log('\n' + '═'.repeat(80));

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
