#!/usr/bin/env node
/**
 * التحقيق النهائي: من كتب الـ484 فيلم؟
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
  console.log('1️⃣  mtime للملف المحظور vs created_at في Turso');
  console.log('=' .repeat(80));
  
  const backupPath = path.join(__dirname, 'BACKUP', 'scripts', 'sync-to-turso-optimized.js.backup');
  const stats = fs.statSync(backupPath);
  
  console.log(`\n📁 الملف: ${backupPath}`);
  console.log(`📅 mtime (آخر تعديل): ${stats.mtime.toISOString()}`);
  console.log(`📅 birthtime (تاريخ الإنشاء): ${stats.birthtime.toISOString()}`);
  
  const sample = await turso.execute({
    sql: 'SELECT id, tmdb_id, title_en, created_at FROM movies ORDER BY id LIMIT 5',
    args: []
  });
  
  console.log('\n🗄️  أول 5 صفوف من Turso:');
  for (const row of sample.rows) {
    console.log(`  [${row.id}] ${row.title_en}`);
    console.log(`      created_at: ${row.created_at}`);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('2️⃣  كل الملفات اللي فيها "INSERT INTO movies"');
  console.log('=' .repeat(80));
  
  // البحث في كل المشروع
  const { execSync } = require('child_process');
  try {
    const result = execSync('findstr /S /I /M "INSERT INTO movies" *.js', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    console.log('\n📄 الملفات الموجودة:');
    console.log(result);
  } catch (e) {
    if (e.stdout) {
      console.log('\n📄 الملفات الموجودة:');
      console.log(e.stdout);
    } else {
      console.log('\n❌ لم يُعثر على ملفات تحتوي على "INSERT INTO movies"');
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('3️⃣  keywords_json الخام لـ Taxi Driver (tmdb_id=103)');
  console.log('=' .repeat(80));
  
  const taxi = await turso.execute({
    sql: 'SELECT tmdb_id, title_en, keywords_json FROM movies WHERE tmdb_id = 103',
    args: []
  });
  
  if (taxi.rows.length > 0) {
    const row = taxi.rows[0];
    console.log(`\n🎬 ${row.title_en} (${row.tmdb_id})`);
    console.log('\n📋 keywords_json الخام:');
    console.log(row.keywords_json);
    
    if (row.keywords_json) {
      try {
        const parsed = JSON.parse(row.keywords_json);
        console.log('\n🔍 الكلمات المفتاحية (parsed):');
        if (Array.isArray(parsed)) {
          parsed.forEach((kw, i) => {
            const flag = (kw.name && kw.name.toLowerCase().includes('porn')) ? '🚫' : '  ';
            console.log(`  ${flag} [${i}] ${JSON.stringify(kw)}`);
          });
        } else {
          console.log('  (ليس array):', parsed);
        }
      } catch (e) {
        console.log('  ❌ فشل الـ parse:', e.message);
      }
    }
  } else {
    console.log('\n❌ Taxi Driver غير موجود في Turso');
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('4️⃣  محتوى audit-results.txt الخام كامل');
  console.log('=' .repeat(80));
  
  const auditPath = path.join(__dirname, 'audit-results.txt');
  if (fs.existsSync(auditPath)) {
    const content = fs.readFileSync(auditPath, 'utf8');
    console.log('\n📄 المحتوى الخام:');
    console.log(content);
    
    // تحليل: هل وصل لـ484؟
    const lines = content.split('\n');
    const progressLines = lines.filter(l => l.includes('/484'));
    if (progressLines.length > 0) {
      const lastProgress = progressLines[progressLines.length - 1];
      console.log('\n🔍 آخر سطر progress:');
      console.log(lastProgress);
      
      if (lastProgress.includes('450/484')) {
        console.log('\n⚠️  التدقيق توقف عند 450/484 - لم يكتمل!');
      } else if (lastProgress.includes('484/484')) {
        console.log('\n✅ التدقيق وصل لـ484/484');
      }
    }
  } else {
    console.log('\n❌ الملف audit-results.txt غير موجود');
  }
}

main().catch(console.error);
