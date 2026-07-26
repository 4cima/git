require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('💾 بدء Backup المسلسلات (بدفعات)\n');
console.log('═'.repeat(70));

async function backupSeriesInChunks() {
  const CHUNK_SIZE = 1000;
  let offset = 0;
  let allRows = [];
  let columns = null;
  
  console.log(`\n📦 جاري backup tv_series بدفعات (${CHUNK_SIZE} صف/دفعة)...\n`);
  
  while (true) {
    const result = await turso.execute({
      sql: `SELECT * FROM tv_series LIMIT ? OFFSET ?`,
      args: [CHUNK_SIZE, offset]
    });
    
    if (result.rows.length === 0) break;
    
    if (!columns) columns = result.columns;
    
    allRows = allRows.concat(result.rows);
    offset += result.rows.length;
    
    console.log(`   📥 تم جلب ${offset.toLocaleString()} صف...`);
    
    if (result.rows.length < CHUNK_SIZE) break;
  }
  
  console.log(`\n   ✅ إجمالي: ${allRows.length.toLocaleString()} صف`);
  
  // حفظ كـ JSON
  const data = {
    table: 'tv_series',
    backup_date: new Date().toISOString(),
    row_count: allRows.length,
    columns: columns,
    rows: allRows
  };
  
  fs.writeFileSync('BACKUP-tv_series-turso.json', JSON.stringify(data, null, 2));
  
  const fileSize = (fs.statSync('BACKUP-tv_series-turso.json').size / 1024 / 1024).toFixed(2);
  console.log(`   💾 حفظ في: BACKUP-tv_series-turso.json`);
  console.log(`   📊 حجم الملف: ${fileSize} MB`);
  
  return { rows: allRows.length, size: fileSize };
}

async function main() {
  try {
    const seriesStats = await backupSeriesInChunks();
    
    // التحقق من backup الأفلام
    const moviesExists = fs.existsSync('BACKUP-movies-turso.json');
    let moviesStats = null;
    
    if (moviesExists) {
      const moviesSize = (fs.statSync('BACKUP-movies-turso.json').size / 1024 / 1024).toFixed(2);
      const moviesData = JSON.parse(fs.readFileSync('BACKUP-movies-turso.json', 'utf-8'));
      moviesStats = { rows: moviesData.row_count, size: moviesSize };
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ Backup اكتمل بنجاح!\n');
    console.log('📊 الملخص:');
    if (moviesStats) {
      console.log(`   🎬 الأفلام: ${moviesStats.rows.toLocaleString()} صف (${moviesStats.size} MB)`);
    }
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
