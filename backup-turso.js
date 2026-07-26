require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('💾 بدء Backup من Turso\n');
console.log('═'.repeat(70));

async function backupTable(tableName, filename) {
  console.log(`\n📦 جاري backup ${tableName}...`);
  
  const startTime = Date.now();
  
  // جلب كل البيانات
  const result = await turso.execute(`SELECT * FROM ${tableName}`);
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ✅ تم جلب ${result.rows.length} صف في ${elapsed} ثانية`);
  
  // حفظ كـ JSON
  const data = {
    table: tableName,
    backup_date: new Date().toISOString(),
    row_count: result.rows.length,
    columns: result.columns,
    rows: result.rows
  };
  
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  
  const fileSize = (fs.statSync(filename).size / 1024 / 1024).toFixed(2);
  console.log(`   💾 حفظ في: ${filename}`);
  console.log(`   📊 حجم الملف: ${fileSize} MB`);
  
  return { rows: result.rows.length, size: fileSize };
}

async function main() {
  try {
    // Backup الأفلام
    const moviesStats = await backupTable('movies', 'BACKUP-movies-turso.json');
    
    // Backup المسلسلات
    const seriesStats = await backupTable('tv_series', 'BACKUP-tv_series-turso.json');
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ Backup اكتمل بنجاح!\n');
    console.log('📊 الملخص:');
    console.log(`   🎬 الأفلام: ${moviesStats.rows.toLocaleString()} صف (${moviesStats.size} MB)`);
    console.log(`   📺 المسلسلات: ${seriesStats.rows.toLocaleString()} صف (${seriesStats.size} MB)`);
    console.log(`   📁 الملفات:`);
    console.log(`      - BACKUP-movies-turso.json`);
    console.log(`      - BACKUP-tv_series-turso.json`);
    console.log('\n💡 يمكن الآن تنفيذ UPDATE بأمان');
    console.log('═'.repeat(70));
    
    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ في Backup:', e.message);
    process.exit(1);
  }
}

main();
