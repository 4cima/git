const fs = require('fs');

console.log('📊 مراقبة backup المسلسلات...\n');

const TARGET_ROWS = 44620;
const CHECK_INTERVAL = 10000; // 10 ثوانٍ

function checkBackup() {
  try {
    if (!fs.existsSync('BACKUP-tv_series-turso.csv')) {
      console.log('⏳ في انتظار بدء الملف...');
      return false;
    }
    
    const content = fs.readFileSync('BACKUP-tv_series-turso.csv', 'utf-8');
    const lines = content.split('\n').length - 1; // minus header
    const actualRows = lines - 1; // minus header line
    
    const progress = (actualRows / TARGET_ROWS * 100).toFixed(1);
    const fileSize = (fs.statSync('BACKUP-tv_series-turso.csv').size / 1024 / 1024).toFixed(2);
    
    console.log(`[${new Date().toLocaleTimeString('ar-EG')}] 📥 ${actualRows.toLocaleString()}/${TARGET_ROWS.toLocaleString()} (${progress}%) | ${fileSize} MB`);
    
    if (actualRows >= TARGET_ROWS) {
      console.log('\n✅ Backup اكتمل!');
      return true;
    }
    
    return false;
  } catch (e) {
    console.log(`⚠️ خطأ في القراءة: ${e.message}`);
    return false;
  }
}

console.log('الهدف: ' + TARGET_ROWS.toLocaleString() + ' صف\n');
console.log('═'.repeat(60));

const interval = setInterval(() => {
  if (checkBackup()) {
    clearInterval(interval);
    process.exit(0);
  }
}, CHECK_INTERVAL);

// فحص أولي
checkBackup();
