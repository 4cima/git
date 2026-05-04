#!/usr/bin/env node
const db = require('./services/local-db');
const { translateText } = require('./services/translation-service-cjs');

async function main() {
  console.log('🔞 ترجمة التصنيفات القصيرة المتبقية\n');
  
  // Get all certifications without Arabic translation
  const certs = db.prepare(`
    SELECT id, meaning_en 
    FROM certifications 
    WHERE meaning_ar IS NULL 
    AND meaning_en IS NOT NULL
    AND meaning_en != ''
    AND meaning_en != 'N/A'
  `).all();
  
  console.log(`📊 عدد التصنيفات المطلوب ترجمتها: ${certs.length}\n`);
  
  let translated = 0;
  for (const cert of certs) {
    try {
      const ar = await translateText(cert.meaning_en, 'ar');
      if (ar && ar.length > 0) {
        db.prepare('UPDATE certifications SET meaning_ar = ? WHERE id = ?').run(ar, cert.id);
        translated++;
        console.log(`   ✅ ${translated}/${certs.length}: ${cert.meaning_en.substring(0, 40)} → ${ar.substring(0, 40)}`);
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (error) {
      console.log(`   ⚠️ خطأ في ترجمة: ${cert.meaning_en.substring(0, 40)}`);
    }
  }
  
  console.log(`\n✅ تم ترجمة ${translated} تصنيف`);
  
  // Summary
  const certsTranslated = db.prepare('SELECT COUNT(*) as count FROM certifications WHERE meaning_ar IS NOT NULL').get();
  const certsTotal = db.prepare('SELECT COUNT(*) as count FROM certifications').get();
  
  console.log(`\n📊 النتيجة النهائية: ${certsTranslated.count}/${certsTotal.count} (${Math.round(certsTranslated.count/certsTotal.count*100)}%)`);
}

main();
