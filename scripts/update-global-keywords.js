#!/usr/bin/env node
/**
 * ============================================
 * 📊 UPDATE GLOBAL KEYWORDS
 * ============================================
 * 1. Add missing Arabic keywords to local DB
 * 2. Clear Turso global_keywords
 * 3. Sync from local to Turso
 * ============================================
 */

const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Local DB
const localDb = new Database(path.join(__dirname, '..', 'data', '4cima-local.db'));

// Turso
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// New keywords to add
const newKeywords = [
  // كلمات أساسية مفقودة
  { keyword_en: 'felm', keyword_ar: 'فلم', category: 'content' },
  { keyword_en: 'episode', keyword_ar: 'حلقة', category: 'content' },
  { keyword_en: 'season', keyword_ar: 'موسم', category: 'content' },
  { keyword_en: 'arabic', keyword_ar: 'عربي', category: 'origin' },
  { keyword_en: 'streaming', keyword_ar: 'بث مباشر', category: 'method' },
  
  // كلمات منافسين (مهمة للـ SEO)
  { keyword_en: 'egybest', keyword_ar: 'ايجي بست', category: 'competitor' },
  { keyword_en: 'cima', keyword_ar: 'سيما', category: 'competitor' },
  { keyword_en: 'mycima', keyword_ar: 'ماي سيما', category: 'competitor' },
  { keyword_en: 'wecima', keyword_ar: 'وي سيما', category: 'competitor' },
  { keyword_en: 'shahid4u', keyword_ar: 'شاهد فور يو', category: 'competitor' },
  { keyword_en: 'cimaclub', keyword_ar: 'سيما كلوب', category: 'competitor' },
  { keyword_en: 'faselhd', keyword_ar: 'فاصل اعلاني', category: 'competitor' },
  { keyword_en: 'akwam', keyword_ar: 'اكوام', category: 'competitor' },
  { keyword_en: 'elcinema', keyword_ar: 'السينما للجميع', category: 'competitor' },
  { keyword_en: 'egynow', keyword_ar: 'ايجي ناو', category: 'competitor' },
  { keyword_en: 'shahed', keyword_ar: 'شاهد نت', category: 'competitor' }
];

async function main() {
  console.log('📊 تحديث global_keywords\n');
  console.log('═'.repeat(80));

  try {
    // Step 1: Add new keywords to local DB
    console.log('\n1️⃣ إضافة الكلمات الجديدة للقاعدة المحلية...');
    
    const insertStmt = localDb.prepare(`
      INSERT OR IGNORE INTO global_keywords (keyword_en, keyword_ar, category, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    let added = 0;
    for (const kw of newKeywords) {
      const result = insertStmt.run(kw.keyword_en, kw.keyword_ar, kw.category);
      if (result.changes > 0) {
        added++;
        console.log(`   ✅ ${kw.keyword_en} → ${kw.keyword_ar}`);
      }
    }
    console.log(`\n   📊 تمت إضافة ${added} كلمة جديدة`);

    // Step 2: Get all keywords from local
    const allKeywords = localDb.prepare('SELECT * FROM global_keywords ORDER BY id').all();
    console.log(`\n2️⃣ إجمالي الكلمات في القاعدة المحلية: ${allKeywords.length}`);

    // Step 3: Clear Turso
    console.log('\n3️⃣ حذف البيانات القديمة من Turso...');
    await turso.execute('DELETE FROM global_keywords');
    console.log('   ✅ تم حذف البيانات القديمة');

    // Step 4: Sync to Turso
    console.log('\n4️⃣ مزامنة الكلمات إلى Turso...');
    
    let synced = 0;
    for (const kw of allKeywords) {
      await turso.execute({
        sql: `INSERT INTO global_keywords (id, keyword_en, keyword_ar, category, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [kw.id, kw.keyword_en, kw.keyword_ar, kw.category, kw.created_at]
      });
      synced++;
      
      if (synced % 10 === 0) {
        process.stdout.write(`\r   📊 تمت مزامنة ${synced}/${allKeywords.length} كلمة...`);
      }
    }
    console.log(`\r   ✅ تمت مزامنة ${synced} كلمة`);

    // Step 5: Verify
    console.log('\n5️⃣ التحقق من البيانات...');
    const tursoCount = await turso.execute('SELECT COUNT(*) as count FROM global_keywords');
    console.log(`   📊 Turso: ${tursoCount.rows[0].count} كلمة`);

    // Sample
    const sample = await turso.execute("SELECT * FROM global_keywords WHERE category = 'competitor' LIMIT 5");
    console.log('\n   📋 عينة من كلمات المنافسين:');
    sample.rows.forEach(row => {
      console.log(`   - ${row.keyword_en} → ${row.keyword_ar}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ اكتمل التحديث بنجاح!');
    console.log(`   📊 إجمالي: ${allKeywords.length} كلمة مفتاحية`);
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    localDb.close();
  }
}

main();
