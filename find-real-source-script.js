#!/usr/bin/env node
/**
 * البحث عن السكريبت الحقيقي الذي كتب البيانات
 */

const fs = require('fs');
const path = require('path');

const scriptsToCheck = [
  'scripts/sync-to-turso-optimized.js',
  'scripts/sync-to-turso-ultra-fast.js',
  'scripts/3-sync-to-turso.js',
  'BACKUP/scripts/sync-to-turso-optimized.js.backup'
];

console.log('='.repeat(80));
console.log('🔍 البحث عن "backdrop_path" في سكريبتات المزامنة');
console.log('='.repeat(80));

const results = [];

for (const scriptPath of scriptsToCheck) {
  const fullPath = path.join(__dirname, scriptPath);
  
  console.log(`\n📄 ${scriptPath}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log('   ❌ الملف غير موجود');
    continue;
  }
  
  const stats = fs.statSync(fullPath);
  console.log(`   📅 mtime: ${stats.mtime.toISOString()}`);
  console.log(`   📅 birthtime: ${stats.birthtime.toISOString()}`);
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // البحث عن backdrop_path
  const hasBackdropPath = content.includes('backdrop_path');
  console.log(`   🔍 يحتوي على "backdrop_path": ${hasBackdropPath ? '✅ نعم' : '❌ لا'}`);
  
  if (hasBackdropPath) {
    // عدد المرات
    const matches = content.match(/backdrop_path/g);
    console.log(`   📊 عدد المرات: ${matches ? matches.length : 0}`);
    
    // هل في INSERT statement؟
    const insertMatch = content.match(/INSERT INTO movies[^;]*/i);
    if (insertMatch) {
      const insertStatement = insertMatch[0];
      const hasBackdropInInsert = insertStatement.includes('backdrop_path');
      console.log(`   📝 في INSERT INTO movies: ${hasBackdropInInsert ? '✅ نعم' : '❌ لا'}`);
    }
  }
  
  // مقارنة مع تاريخ البيانات (24 يوليو 2026 الساعة 23:53)
  const dataDate = new Date('2026-07-24T23:53:00Z');
  const fileDate = new Date(stats.mtime);
  const beforeOrEqual = fileDate <= dataDate;
  
  console.log(`   ⏰ mtime ${beforeOrEqual ? '≤' : '>'} تاريخ البيانات (24 يوليو 23:53): ${beforeOrEqual ? '✅ محتمل' : '❌ غير محتمل'}`);
  
  results.push({
    path: scriptPath,
    exists: true,
    hasBackdropPath,
    mtime: stats.mtime.toISOString(),
    beforeOrEqual
  });
}

console.log('\n' + '='.repeat(80));
console.log('📊 الملخص');
console.log('='.repeat(80));

const candidates = results.filter(r => r.hasBackdropPath && r.beforeOrEqual);

if (candidates.length > 0) {
  console.log('\n✅ السكريبتات المرشحة (فيها backdrop_path + تاريخها قبل/يساوي 24 يوليو):');
  candidates.forEach(c => {
    console.log(`   • ${c.path}`);
    console.log(`     mtime: ${c.mtime}`);
  });
} else {
  console.log('\n❌ لا يوجد سكريبت مرشح!');
  console.log('   هذا يعني: إما السكريبت تم تعديله بعد كتابة البيانات،');
  console.log('   أو البيانات كُتبت بسكريبت آخر غير موجود في المجموعة المفحوصة.');
}

console.log('\n📌 تاريخ البيانات المستهدف: 2026-07-24T23:53:00Z');
