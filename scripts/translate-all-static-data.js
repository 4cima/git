#!/usr/bin/env node
/**
 * ============================================
 * 🌍 ترجمة كل البيانات الثابتة
 * ============================================
 * Purpose: Translate all remaining static data to Arabic
 * ============================================
 */

const db = require('./services/local-db');
const { translateText } = require('./services/translation-service-cjs');

// ============================================
// TRANSLATE JOBS
// ============================================
async function translateJobs() {
  console.log('\n💼 ترجمة الوظائف...');
  
  const jobs = db.prepare(`
    SELECT id, name_en 
    FROM jobs 
    WHERE name_ar IS NULL
    LIMIT 200
  `).all();
  
  console.log(`   📊 عدد الوظائف المطلوب ترجمتها: ${jobs.length}`);
  
  let translated = 0;
  for (const job of jobs) {
    try {
      const nameAr = await translateText(job.name_en, 'ar');
      if (nameAr) {
        db.prepare('UPDATE jobs SET name_ar = ? WHERE id = ?')
          .run(nameAr, job.id);
        translated++;
        
        if (translated % 20 === 0) {
          console.log(`   ✅ تم ترجمة ${translated}/${jobs.length} وظيفة`);
        }
      }
      
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.log(`   ⚠️ خطأ في ترجمة ${job.name_en}`);
    }
  }
  
  console.log(`   ✅ اكتملت ترجمة ${translated} وظيفة`);
}

// ============================================
// TRANSLATE REMAINING CERTIFICATIONS
// ============================================
async function translateCertifications() {
  console.log('\n🔞 ترجمة باقي التصنيفات العمرية...');
  
  const certs = db.prepare(`
    SELECT id, meaning_en 
    FROM certifications 
    WHERE meaning_ar IS NULL AND meaning_en IS NOT NULL AND length(meaning_en) > 10
    LIMIT 200
  `).all();
  
  console.log(`   📊 عدد التصنيفات المطلوب ترجمتها: ${certs.length}`);
  
  let translated = 0;
  for (const cert of certs) {
    try {
      const meaningAr = await translateText(cert.meaning_en, 'ar');
      if (meaningAr) {
        db.prepare('UPDATE certifications SET meaning_ar = ? WHERE id = ?')
          .run(meaningAr, cert.id);
        translated++;
        
        if (translated % 20 === 0) {
          console.log(`   ✅ تم ترجمة ${translated}/${certs.length} تصنيف`);
        }
      }
      
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.log(`   ⚠️ خطأ في ترجمة تصنيف`);
    }
  }
  
  console.log(`   ✅ اكتملت ترجمة ${translated} تصنيف`);
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('🌍 ترجمة كل البيانات الثابتة\n');
  console.log('═'.repeat(80));

  try {
    // 1. Translate jobs
    await translateJobs();
    
    // 2. Translate certifications
    await translateCertifications();
    
    // 3. Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 الملخص النهائي');
    console.log('═'.repeat(80));
    
    const jobsTranslated = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE name_ar IS NOT NULL').get();
    const jobsTotal = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
    const certsTranslated = db.prepare('SELECT COUNT(*) as count FROM certifications WHERE meaning_ar IS NOT NULL').get();
    const certsTotal = db.prepare('SELECT COUNT(*) as count FROM certifications').get();
    
    console.log(`\n✅ الوظائف: ${jobsTranslated.count}/${jobsTotal.count} مترجمة`);
    console.log(`✅ التصنيفات: ${certsTranslated.count}/${certsTotal.count} مترجمة`);
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ اكتملت ترجمة البيانات الثابتة!');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
