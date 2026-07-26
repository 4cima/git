#!/usr/bin/env node
/**
 * ============================================
 * 📊 SYNC STATIC DATA FROM LOCAL TO TURSO
 * ============================================
 * Purpose: Copy translated static data from local DB to Turso
 * Includes: genres, countries, languages with Arabic translations
 * ============================================
 */

const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Local SQLite
const localDb = new Database(path.join(__dirname, '..', 'data', '4cima-local.db'));

// Turso Client
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// ============================================
// SYNC GENRES
// ============================================
async function syncGenres() {
  console.log('\n🎭 مزامنة الأنواع (Genres)...');
  
  const genres = localDb.prepare(`
    SELECT id, tmdb_id, name_en, name_ar, slug
    FROM genres
    ORDER BY id
  `).all();

  console.log(`   📊 وجدنا ${genres.length} نوع في القاعدة المحلية`);

  let synced = 0;
  for (const genre of genres) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO genres (id, tmdb_id, name_en, name_ar, slug) 
            VALUES (?, ?, ?, ?, ?)`,
      args: [genre.id, genre.tmdb_id, genre.name_en, genre.name_ar, genre.slug]
    });
    synced++;
  }

  console.log(`   ✅ تمت مزامنة ${synced} نوع`);
  return synced;
}

// ============================================
// SYNC COUNTRIES
// ============================================
async function syncCountries() {
  console.log('\n🌍 مزامنة الدول (Countries)...');
  
  const countries = localDb.prepare(`
    SELECT iso_3166_1, english_name, arabic_name
    FROM countries
    ORDER BY iso_3166_1
  `).all();

  console.log(`   📊 وجدنا ${countries.length} دولة في القاعدة المحلية`);

  let synced = 0;
  for (const country of countries) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO countries (iso_3166_1, english_name, arabic_name) 
            VALUES (?, ?, ?)`,
      args: [country.iso_3166_1, country.english_name, country.arabic_name]
    });
    synced++;
  }

  console.log(`   ✅ تمت مزامنة ${synced} دولة`);
  return synced;
}

// ============================================
// SYNC LANGUAGES
// ============================================
async function syncLanguages() {
  console.log('\n🗣️ مزامنة اللغات (Languages)...');
  
  const languages = localDb.prepare(`
    SELECT iso_639_1, english_name, arabic_name
    FROM languages
    ORDER BY iso_639_1
  `).all();

  console.log(`   📊 وجدنا ${languages.length} لغة في القاعدة المحلية`);

  let synced = 0;
  for (const lang of languages) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO languages (iso_639_1, english_name, arabic_name) 
            VALUES (?, ?, ?)`,
      args: [lang.iso_639_1, lang.english_name, lang.arabic_name]
    });
    synced++;
  }

  console.log(`   ✅ تمت مزامنة ${synced} لغة`);
  return synced;
}

// ============================================
// SYNC GLOBAL KEYWORDS
// ============================================
async function syncGlobalKeywords() {
  console.log('\n🔑 مزامنة الكلمات المفتاحية (Global Keywords)...');
  
  const keywords = localDb.prepare(`
    SELECT id, keyword_en, keyword_ar, category, created_at
    FROM global_keywords
    ORDER BY id
  `).all();

  console.log(`   📊 وجدنا ${keywords.length} كلمة في القاعدة المحلية`);

  // Clear old data
  await turso.execute('DELETE FROM global_keywords');

  let synced = 0;
  for (const kw of keywords) {
    await turso.execute({
      sql: `INSERT INTO global_keywords (id, keyword_en, keyword_ar, category, created_at) 
            VALUES (?, ?, ?, ?, ?)`,
      args: [kw.id, kw.keyword_en, kw.keyword_ar, kw.category, kw.created_at]
    });
    synced++;
  }

  console.log(`   ✅ تمت مزامنة ${synced} كلمة`);
  return synced;
}

// ============================================
// VERIFY DATA
// ============================================
async function verifyData() {
  console.log('\n🔍 التحقق من البيانات في Turso...');

  const genresCount = await turso.execute('SELECT COUNT(*) as count FROM genres');
  const countriesCount = await turso.execute('SELECT COUNT(*) as count FROM countries');
  const languagesCount = await turso.execute('SELECT COUNT(*) as count FROM languages');

  console.log(`   📊 الأنواع: ${genresCount.rows[0].count}`);
  console.log(`   📊 الدول: ${countriesCount.rows[0].count}`);
  console.log(`   📊 اللغات: ${languagesCount.rows[0].count}`);

  // Sample data
  console.log('\n📋 عينة من البيانات:');
  
  const sampleGenres = await turso.execute('SELECT * FROM genres LIMIT 3');
  console.log('\n   الأنواع:');
  sampleGenres.rows.forEach(g => {
    console.log(`   - ${g.name_en} (${g.name_ar})`);
  });

  const sampleCountries = await turso.execute('SELECT * FROM countries LIMIT 3');
  console.log('\n   الدول:');
  sampleCountries.rows.forEach(c => {
    console.log(`   - ${c.english_name} (${c.arabic_name})`);
  });

  const sampleLanguages = await turso.execute('SELECT * FROM languages LIMIT 3');
  console.log('\n   اللغات:');
  sampleLanguages.rows.forEach(l => {
    console.log(`   - ${l.english_name} (${l.arabic_name})`);
  });
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('📊 بدء مزامنة البيانات الثابتة من القاعدة المحلية إلى Turso\n');
  console.log('═'.repeat(60));

  try {
    const genresCount = await syncGenres();
    const countriesCount = await syncCountries();
    const languagesCount = await syncLanguages();
    const keywordsCount = await syncGlobalKeywords();
    
    await verifyData();

    console.log('\n' + '═'.repeat(60));
    console.log('✅ اكتملت المزامنة بنجاح!');
    console.log(`   🎭 ${genresCount} نوع`);
    console.log(`   🌍 ${countriesCount} دولة`);
    console.log(`   🗣️ ${languagesCount} لغة`);
    console.log(`   🔑 ${keywordsCount} كلمة مفتاحية`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    localDb.close();
  }
}

main();
