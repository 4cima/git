#!/usr/bin/env node
/**
 * 🚨 فحص حاسم: هل ultra-fast يستخدم فلتر الأمان؟
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('=' .repeat(80));
  console.log('🚨 CRITICAL: فحص استخدام فلتر الأمان في ultra-fast');
  console.log('=' .repeat(80));
  
  // 1. قراءة السكريبت والبحث عن استيراد الفلتر
  console.log('\n1️⃣  فحص استيراد content-filter في ultra-fast:');
  console.log('─'.repeat(80));
  
  const ultraFastPath = path.join(__dirname, 'scripts', 'sync-to-turso-ultra-fast.js');
  const ultraFastContent = fs.readFileSync(ultraFastPath, 'utf8');
  
  const hasContentFilterImport = ultraFastContent.includes('content-filter');
  const hasShouldFilterContent = ultraFastContent.includes('shouldFilterContent');
  const hasIsFiltered = ultraFastContent.includes('is_filtered');
  
  console.log(`📄 الملف: ${ultraFastPath}`);
  console.log(`\n🔍 البحث عن "content-filter": ${hasContentFilterImport ? '✅ موجود' : '❌ غير موجود'}`);
  console.log(`🔍 البحث عن "shouldFilterContent": ${hasShouldFilterContent ? '✅ موجود' : '❌ غير موجود'}`);
  console.log(`🔍 البحث عن "is_filtered": ${hasIsFiltered ? '✅ موجود' : '❌ غير موجود'}`);
  
  // اطبع أول 30 سطر (الـimports)
  const lines = ultraFastContent.split('\n');
  console.log('\n📋 أول 20 سطر من السكريبت (منطقة الـimports):');
  lines.slice(0, 20).forEach((line, i) => {
    console.log(`${String(i + 1).padStart(3, ' ')}: ${line}`);
  });
  
  // البحث عن السطر الذي يفحص is_filtered
  console.log('\n📋 السطور التي تحتوي على "is_filtered":');
  lines.forEach((line, i) => {
    if (line.includes('is_filtered')) {
      console.log(`${String(i + 1).padStart(3, ' ')}: ${line}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('2️⃣  فحص prepare-content-for-turso.js (المستورد من ultra-fast):');
  console.log('─'.repeat(80));
  
  const preparePath = path.join(__dirname, 'scripts', 'prepare-content-for-turso.js');
  if (fs.existsSync(preparePath)) {
    const prepareContent = fs.readFileSync(preparePath, 'utf8');
    const prepareHasFilter = prepareContent.includes('content-filter');
    const prepareHasShouldFilter = prepareContent.includes('shouldFilterContent');
    
    console.log(`📄 الملف: ${preparePath}`);
    console.log(`🔍 يحتوي على "content-filter": ${prepareHasFilter ? '✅ نعم' : '❌ لا'}`);
    console.log(`🔍 يحتوي على "shouldFilterContent": ${prepareHasShouldFilter ? '✅ نعم' : '❌ لا'}`);
  } else {
    console.log('❌ الملف غير موجود');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('3️⃣  فحص الأعمدة الفارغة في Turso:');
  console.log('─'.repeat(80));
  
  const companiesNull = await turso.execute({
    sql: 'SELECT COUNT(*) as count FROM movies WHERE companies_json IS NULL',
    args: []
  });
  
  const keywordsNull = await turso.execute({
    sql: 'SELECT COUNT(*) as count FROM movies WHERE keywords_json IS NULL',
    args: []
  });
  
  const voteCountNull = await turso.execute({
    sql: 'SELECT COUNT(*) as count FROM movies WHERE vote_count IS NULL',
    args: []
  });
  
  const popularityNull = await turso.execute({
    sql: 'SELECT COUNT(*) as count FROM movies WHERE popularity IS NULL',
    args: []
  });
  
  const runtimeNull = await turso.execute({
    sql: 'SELECT COUNT(*) as count FROM movies WHERE runtime IS NULL',
    args: []
  });
  
  const backdropNull = await turso.execute({
    sql: 'SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NULL',
    args: []
  });
  
  const total = await turso.execute({
    sql: 'SELECT COUNT(*) as count FROM movies',
    args: []
  });
  
  const totalCount = total.rows[0].count;
  
  console.log(`\n📊 إجمالي الأفلام: ${totalCount}`);
  console.log('\n🔍 الأعمدة الفارغة (NULL):');
  console.log(`   companies_json:  ${companiesNull.rows[0].count} (${((companiesNull.rows[0].count / totalCount) * 100).toFixed(1)}%)`);
  console.log(`   keywords_json:   ${keywordsNull.rows[0].count} (${((keywordsNull.rows[0].count / totalCount) * 100).toFixed(1)}%)`);
  console.log(`   vote_count:      ${voteCountNull.rows[0].count} (${((voteCountNull.rows[0].count / totalCount) * 100).toFixed(1)}%)`);
  console.log(`   popularity:      ${popularityNull.rows[0].count} (${((popularityNull.rows[0].count / totalCount) * 100).toFixed(1)}%)`);
  console.log(`   runtime:         ${runtimeNull.rows[0].count} (${((runtimeNull.rows[0].count / totalCount) * 100).toFixed(1)}%)`);
  console.log(`   backdrop_path:   ${backdropNull.rows[0].count} (${((backdropNull.rows[0].count / totalCount) * 100).toFixed(1)}%)`);
  
  // عينة من البيانات الفعلية
  console.log('\n📋 عينة من 5 أفلام (للتحقق من البيانات الفعلية):');
  const sample = await turso.execute({
    sql: `SELECT tmdb_id, title_en, 
          vote_count, popularity, runtime, 
          CASE WHEN backdrop_path IS NULL THEN 'NULL' ELSE 'filled' END as backdrop,
          CASE WHEN companies_json IS NULL THEN 'NULL' ELSE 'filled' END as companies,
          CASE WHEN keywords_json IS NULL THEN 'NULL' ELSE 'filled' END as keywords
          FROM movies ORDER BY id LIMIT 5`,
    args: []
  });
  
  sample.rows.forEach(row => {
    console.log(`\n   [${row.tmdb_id}] ${row.title_en}`);
    console.log(`      vote_count: ${row.vote_count}`);
    console.log(`      popularity: ${row.popularity}`);
    console.log(`      runtime: ${row.runtime}`);
    console.log(`      backdrop_path: ${row.backdrop}`);
    console.log(`      companies_json: ${row.companies}`);
    console.log(`      keywords_json: ${row.keywords}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('4️⃣  البحث عن "ultra-fast" في ملفات التوثيق:');
  console.log('─'.repeat(80));
  
  // البحث في .md و comments
  const { execSync } = require('child_process');
  try {
    const mdResults = execSync('findstr /S /I /N "ultra-fast\\|ultra fast" *.md', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    console.log('\n📄 نتائج البحث في ملفات .md:');
    console.log(mdResults || 'لا توجد نتائج');
  } catch (e) {
    console.log('\n❌ لم يُعثر على "ultra-fast" في ملفات .md');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🚨 التحليل الحاسم:');
  console.log('=' .repeat(80));
  
  if (!hasContentFilterImport && !hasShouldFilterContent) {
    console.log('\n❌❌❌ تأكيد حاسم:');
    console.log('   • sync-to-turso-ultra-fast.js لا يستورد content-filter');
    console.log('   • لا يستدعي shouldFilterContent في أي مكان');
    console.log('   • يسحب من local.db حيث is_filtered = 0');
    console.log('   • معناه: يعتمد على الفلترة التي حصلت في 1-fetch-and-enrich.js');
    console.log('\n🔍 السؤال الحاسم: هل 1-fetch-and-enrich.js كان يفلتر صح وقت كتابة الـ484؟');
  } else {
    console.log('\n✅ السكريبت يحتوي على فلتر أمان');
  }
}

main().catch(console.error);
