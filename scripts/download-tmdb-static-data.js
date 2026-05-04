#!/usr/bin/env node
/**
 * ============================================
 * 📥 تحميل البيانات الثابتة من TMDB
 * ============================================
 * Purpose: Download all static data from TMDB and save to JSON files
 * ============================================
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

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
// SAVE TO FILE
// ============================================
function saveToFile(filename, data) {
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`   ✅ تم حفظ: ${filename}`);
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('📥 تحميل البيانات الثابتة من TMDB\n');
  console.log('═'.repeat(80));

  try {
    // 1. Configuration
    console.log('\n📊 1. Configuration (الإعدادات)');
    const config = await fetchFromTMDB('/configuration');
    if (config) {
      saveToFile('tmdb-config.json', config);
    }

    // 2. Movie Genres
    console.log('\n📊 2. Movie Genres (أنواع الأفلام)');
    const movieGenres = await fetchFromTMDB('/genre/movie/list');
    if (movieGenres) {
      saveToFile('tmdb-movie-genres.json', movieGenres);
    }

    // 3. TV Genres
    console.log('\n📊 3. TV Genres (أنواع المسلسلات)');
    const tvGenres = await fetchFromTMDB('/genre/tv/list');
    if (tvGenres) {
      saveToFile('tmdb-tv-genres.json', tvGenres);
    }

    // 4. Languages
    console.log('\n📊 4. Languages (اللغات)');
    const languages = await fetchFromTMDB('/configuration/languages');
    if (languages) {
      saveToFile('tmdb-languages.json', languages);
    }

    // 5. Countries
    console.log('\n📊 5. Countries (الدول)');
    const countries = await fetchFromTMDB('/configuration/countries');
    if (countries) {
      saveToFile('tmdb-countries.json', countries);
    }

    // 6. Timezones
    console.log('\n📊 6. Timezones (المناطق الزمنية)');
    const timezones = await fetchFromTMDB('/configuration/timezones');
    if (timezones) {
      saveToFile('tmdb-timezones.json', timezones);
    }

    // 7. Jobs
    console.log('\n📊 7. Jobs/Departments (الوظائف)');
    const jobs = await fetchFromTMDB('/configuration/jobs');
    if (jobs) {
      saveToFile('tmdb-jobs.json', jobs);
    }

    // 8. Primary Translations
    console.log('\n📊 8. Primary Translations (اللغات المدعومة)');
    const translations = await fetchFromTMDB('/configuration/primary_translations');
    if (translations) {
      saveToFile('tmdb-primary-translations.json', translations);
    }

    // 9. Movie Certifications
    console.log('\n📊 9. Movie Certifications (تصنيفات الأفلام)');
    const movieCerts = await fetchFromTMDB('/certification/movie/list');
    if (movieCerts) {
      saveToFile('tmdb-movie-certifications.json', movieCerts);
    }

    // 10. TV Certifications
    console.log('\n📊 10. TV Certifications (تصنيفات المسلسلات)');
    const tvCerts = await fetchFromTMDB('/certification/tv/list');
    if (tvCerts) {
      saveToFile('tmdb-tv-certifications.json', tvCerts);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ تم تحميل وحفظ جميع البيانات الثابتة بنجاح!');
    console.log('═'.repeat(80));

    // Summary
    console.log('\n📋 الملفات المحفوظة:');
    console.log('   1. tmdb-config.json');
    console.log('   2. tmdb-movie-genres.json');
    console.log('   3. tmdb-tv-genres.json');
    console.log('   4. tmdb-languages.json');
    console.log('   5. tmdb-countries.json');
    console.log('   6. tmdb-timezones.json');
    console.log('   7. tmdb-jobs.json');
    console.log('   8. tmdb-primary-translations.json');
    console.log('   9. tmdb-movie-certifications.json');
    console.log('   10. tmdb-tv-certifications.json');

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
