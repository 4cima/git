require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/services/local-db');
const { spawn } = require('child_process');

const SYNC_INTERVAL = 300000; // 5 دقائق
const MIN_BATCH_SIZE = 100; // مزامنة عند توفر 100 فيلم مكتمل على الأقل

let isSyncing = false;

function checkAndSync() {
  if (isSyncing) {
    console.log('⏳ المزامنة جارية بالفعل، تم التخطي...');
    return;
  }
  
  // فحص عدد الأفلام الجاهزة للمزامنة
  const pending = db.prepare(`
    SELECT COUNT(*) as count
    FROM movies
    WHERE is_complete = 1 
      AND is_filtered = 0 
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
  `).get();
  
  console.log(`\n🔍 [${new Date().toLocaleTimeString('ar-EG')}] فحص الأفلام الجاهزة...`);
  console.log(`📊 عدد الأفلام الجاهزة للمزامنة: ${pending.count}`);
  
  if (pending.count < MIN_BATCH_SIZE) {
    console.log(`⏭️  تخطي المزامنة (أقل من ${MIN_BATCH_SIZE} فيلم)`);
    return;
  }
  
  console.log('🚀 بدء المزامنة...\n');
  isSyncing = true;
  
  // تشغيل سكريبت المزامنة
  const syncProcess = spawn('node', ['scripts/sync-to-turso-optimized.js'], {
    stdio: 'inherit'
  });
  
  syncProcess.on('exit', (code) => {
    isSyncing = false;
    if (code === 0) {
      console.log('\n✅ المزامنة اكتملت بنجاح');
    } else {
      console.log(`\n⚠️ المزامنة انتهت بكود: ${code}`);
    }
  });
  
  syncProcess.on('error', (err) => {
    isSyncing = false;
    console.error('❌ خطأ في المزامنة:', err.message);
  });
}

console.log('═'.repeat(70));
console.log('🔄 المزامنة التدريجية التلقائية');
console.log('═'.repeat(70));
console.log(`⚙️  الإعدادات:`);
console.log(`   - الفاصل الزمني: ${SYNC_INTERVAL / 1000 / 60} دقائق`);
console.log(`   - الحد الأدنى للدفعة: ${MIN_BATCH_SIZE} فيلم`);
console.log('═'.repeat(70));
console.log('\n🚀 بدء المراقبة...\n');

// الفحص الأولي
checkAndSync();

// فحص دوري
setInterval(checkAndSync, SYNC_INTERVAL);
