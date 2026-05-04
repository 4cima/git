#!/usr/bin/env node
/**
 * ============================================
 * 🌍 ترجمة البيانات الثابتة للعربية
 * ============================================
 * Purpose: Translate all countries and languages to Arabic
 * ============================================
 */

const db = require('./services/local-db');
const { translateText } = require('./services/translation-service-cjs');

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('🌍 بدء ترجمة البيانات الثابتة للعربية\n');
  console.log('═'.repeat(60));

  try {
    // 1. Translate Countries
    console.log('\n🌍 ترجمة الدول...');
    const countries = db.prepare('SELECT * FROM countries WHERE arabic_name IS NULL').all();
    console.log(`   📊 عدد الدول المطلوب ترجمتها: ${countries.length}`);
    
    let countryCount = 0;
    for (const country of countries) {
      try {
        const arabicName = await translateText(country.english_name, 'ar');
        if (arabicName) {
          db.prepare('UPDATE countries SET arabic_name = ? WHERE iso_3166_1 = ?')
            .run(arabicName, country.iso_3166_1);
          countryCount++;
          
          if (countryCount % 10 === 0) {
            console.log(`   ✅ تم ترجمة ${countryCount}/${countries.length} دولة`);
          }
        }
        
        // تأخير بسيط لتجنب Rate Limiting
        await new Promise(r => setTimeout(r, 300));
      } catch (error) {
        console.log(`   ⚠️ خطأ في ترجمة ${country.english_name}: ${error.message}`);
      }
    }
    console.log(`   ✅ اكتملت ترجمة ${countryCount} دولة`);

    // 2. Translate Languages
    console.log('\n🗣️ ترجمة اللغات...');
    const languages = db.prepare('SELECT * FROM languages WHERE arabic_name IS NULL').all();
    console.log(`   📊 عدد اللغات المطلوب ترجمتها: ${languages.length}`);
    
    let langCount = 0;
    for (const lang of languages) {
      try {
        const arabicName = await translateText(lang.english_name, 'ar');
        if (arabicName) {
          db.prepare('UPDATE languages SET arabic_name = ? WHERE iso_639_1 = ?')
            .run(arabicName, lang.iso_639_1);
          langCount++;
          
          if (langCount % 10 === 0) {
            console.log(`   ✅ تم ترجمة ${langCount}/${languages.length} لغة`);
          }
        }
        
        // تأخير بسيط لتجنب Rate Limiting
        await new Promise(r => setTimeout(r, 300));
      } catch (error) {
        console.log(`   ⚠️ خطأ في ترجمة ${lang.english_name}: ${error.message}`);
      }
    }
    console.log(`   ✅ اكتملت ترجمة ${langCount} لغة`);

    // 3. Verify
    console.log('\n🔍 التحقق من النتائج...');
    const countriesWithArabic = db.prepare('SELECT COUNT(*) as count FROM countries WHERE arabic_name IS NOT NULL').get();
    const countriesTotal = db.prepare('SELECT COUNT(*) as count FROM countries').get();
    const langsWithArabic = db.prepare('SELECT COUNT(*) as count FROM languages WHERE arabic_name IS NOT NULL').get();
    const langsTotal = db.prepare('SELECT COUNT(*) as count FROM languages').get();

    console.log(`   📊 الدول: ${countriesWithArabic.count}/${countriesTotal.count} مترجمة`);
    console.log(`   📊 اللغات: ${langsWithArabic.count}/${langsTotal.count} مترجمة`);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ اكتملت ترجمة البيانات الثابتة بنجاح!');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
