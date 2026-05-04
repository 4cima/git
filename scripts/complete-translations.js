#!/usr/bin/env node
const db = require('./services/local-db');
const { translateText } = require('./services/translation-service-cjs');

async function main() {
  console.log('🌍 إكمال الترجمات المتبقية\n');
  
  // 1. Translate remaining language
  const lang = db.prepare('SELECT iso_639_1, english_name FROM languages WHERE arabic_name IS NULL').get();
  if (lang) {
    console.log('🗣️ ترجمة اللغة المتبقية:', lang.english_name);
    const ar = await translateText(lang.english_name, 'ar');
    if (ar) {
      db.prepare('UPDATE languages SET arabic_name = ? WHERE iso_639_1 = ?').run(ar, lang.iso_639_1);
      console.log('   ✅', lang.english_name, '→', ar);
    }
  } else {
    console.log('✅ كل اللغات مترجمة');
  }
  
  // 2. Translate remaining certifications
  const certs = db.prepare(`
    SELECT id, meaning_en 
    FROM certifications 
    WHERE meaning_ar IS NULL 
    AND meaning_en IS NOT NULL 
    AND length(meaning_en) > 5
  `).all();
  
  console.log(`\n🔞 ترجمة ${certs.length} تصنيف متبقي...`);
  
  let translated = 0;
  for (const cert of certs) {
    const ar = await translateText(cert.meaning_en, 'ar');
    if (ar) {
      db.prepare('UPDATE certifications SET meaning_ar = ? WHERE id = ?').run(ar, cert.id);
      translated++;
      
      if (translated % 10 === 0) {
        console.log(`   ✅ ${translated}/${certs.length}`);
      }
    }
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n✅ تم ترجمة ${translated} تصنيف`);
  
  // 3. Summary
  const langsTranslated = db.prepare('SELECT COUNT(*) as count FROM languages WHERE arabic_name IS NOT NULL').get();
  const langsTotal = db.prepare('SELECT COUNT(*) as count FROM languages').get();
  const certsTranslated = db.prepare('SELECT COUNT(*) as count FROM certifications WHERE meaning_ar IS NOT NULL').get();
  const certsTotal = db.prepare('SELECT COUNT(*) as count FROM certifications').get();
  
  console.log('\n📊 النتيجة النهائية:');
  console.log(`   🗣️ اللغات: ${langsTranslated.count}/${langsTotal.count}`);
  console.log(`   🔞 التصنيفات: ${certsTranslated.count}/${certsTotal.count}`);
}

main();
