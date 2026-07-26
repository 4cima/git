require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('💾 بدء Backup المسلسلات (CSV)\n');
console.log('═'.repeat(70));

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function backupSeriesAsCSV() {
  const CHUNK_SIZE = 1000;
  let offset = 0;
  let totalRows = 0;
  let columns = null;
  
  const stream = fs.createWriteStream('BACKUP-tv_series-turso.csv');
  
  console.log(`\n📦 جاري backup tv_series كـ CSV...\n`);
  
  while (true) {
    const result = await turso.execute({
      sql: `SELECT * FROM tv_series LIMIT ? OFFSET ?`,
      args: [CHUNK_SIZE, offset]
    });
    
    if (result.rows.length === 0) break;
    
    // كتابة Header في أول مرة
    if (!columns) {
      columns = result.columns;
      stream.write(columns.join(',') + '\n');
    }
    
    // كتابة الصفوف
    for (const row of result.rows) {
      const values = columns.map(col => escapeCSV(row[col]));
      stream.write(values.join(',') + '\n');
    }
    
    offset += result.rows.length;
    totalRows += result.rows.length;
    
    console.log(`   📥 تم حفظ ${totalRows.toLocaleString()} صف...`);
    
    if (result.rows.length < CHUNK_SIZE) break;
  }
  
  stream.end();
  
  return new Promise((resolve) => {
    stream.on('finish', () => {
      const fileSize = (fs.statSync('BACKUP-tv_series-turso.csv').size / 1024 / 1024).toFixed(2);
      console.log(`\n   ✅ إجمالي: ${totalRows.toLocaleString()} صف`);
      console.log(`   💾 حفظ في: BACKUP-tv_series-turso.csv`);
      console.log(`   📊 حجم الملف: ${fileSize} MB`);
      resolve({ rows: totalRows, size: fileSize });
    });
  });
}

async function main() {
  try {
    const seriesStats = await backupSeriesAsCSV();
    
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
    console.log(`      - BACKUP-tv_series-turso.csv`);
    console.log('\n💡 يمكن الآن تنفيذ UPDATE بأمان');
    console.log('═'.repeat(70));
    
    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ في Backup:', e.message);
    process.exit(1);
  }
}

main();
