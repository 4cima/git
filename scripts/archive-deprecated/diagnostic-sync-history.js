const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function analyzeSyncHistory() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('           تشخيص: تاريخ المزامنة مع Turso');
  console.log('═════════════════════════════════════════════════════════════\n');

  // Check local.db
  let localDb;
  try {
    localDb = new Database('./local.db');
    
    // Check if tables exist
    const tables = localDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('movies', 'tv_series')").all();
    
    if (tables.length === 0) {
      console.log('❌ local.db فارغة (لا يوجد جدول movies أو tv_series)\n');
      console.log('📌 الخلاصة: 3-sync-to-turso.js يعتمد على local.db كمصدر للبيانات');
      console.log('   لكن local.db فارغة تماماً!\n');
      console.log('   هذا يفسر لماذا Turso فيها 483 فيلم فقط:\n');
      console.log('   • إما تم ملء Turso يدوياً ببيانات محدودة للاختبار');
      console.log('   • أو تم ملء local.db سابقاً ثم مُسحت وأصبحت فارغة');
      console.log('   • والـ script لم يتم تشغيله على نطاق واسع مؤخراً\n');
      
      localDb.close();
      return;
    }
    
    console.log('✅ local.db موجودة ولديها جداول\n');
    
    // Check movies table structure
    const moviesSchema = localDb.prepare("PRAGMA table_info(movies)").all();
    const hasIsComplete = moviesSchema.some(col => col.name === 'is_complete');
    const hasSyncedToTurso = moviesSchema.some(col => col.name === 'synced_to_turso');
    const hasFilterStatus = moviesSchema.some(col => col.name === 'filter_status');
    
    console.log('📊 بنية جدول movies في local.db:');
    console.log(`   - is_complete: ${hasIsComplete ? '✅ موجود' : '❌ غير موجود'}`);
    console.log(`   - synced_to_turso: ${hasSyncedToTurso ? '✅ موجود' : '❌ غير موجود'}`);
    console.log(`   - filter_status: ${hasFilterStatus ? '✅ موجود' : '❌ غير موجود'}\n`);
    
    if (!hasIsComplete || !hasSyncedToTurso || !hasFilterStatus) {
      console.log('⚠️ الأعمدة المطلوبة للمزامنة غير موجودة في local.db!\n');
      localDb.close();
      return;
    }
    
    // Check data counts
    const totalMovies = localDb.prepare('SELECT COUNT(*) as count FROM movies').get();
    const completeMovies = localDb.prepare('SELECT COUNT(*) as count FROM movies WHERE is_complete = 1').get();
    const cleanMovies = localDb.prepare("SELECT COUNT(*) as count FROM movies WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')").get();
    const syncedMovies = localDb.prepare('SELECT COUNT(*) as count FROM movies WHERE synced_to_turso = 1').get();
    const pendingSync = localDb.prepare("SELECT COUNT(*) as count FROM movies WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') AND synced_to_turso = 0").get();
    
    console.log('📊 إحصائيات الأفلام في local.db:');
    console.log(`   - إجمالي الأفلام: ${totalMovies.count.toLocaleString()}`);
    console.log(`   - أفلام مكتملة (is_complete = 1): ${completeMovies.count.toLocaleString()}`);
    console.log(`   - أفلام نظيفة (clean/reviewed_approved): ${cleanMovies.count.toLocaleString()}`);
    console.log(`   - أفلام متزامنة مع Turso: ${syncedMovies.count.toLocaleString()}`);
    console.log(`   - أفلام في انتظار المزامنة: ${pendingSync.count.toLocaleString()}\n`);
    
    // Check last sync date
    const lastSync = localDb.prepare('SELECT MAX(synced_at) as last_sync FROM movies WHERE synced_to_turso = 1').get();
    if (lastSync.last_sync) {
      console.log(`📅 آخر مزامنة: ${lastSync.last_sync}\n`);
    } else {
      console.log('⚠️ لم يتم تسجيل أي مزامنة سابقة (synced_at كلها NULL)\n');
    }
    
    localDb.close();
    
  } catch (error) {
    console.log('❌ خطأ في فتح local.db:', error.message, '\n');
  }
  
  // Check Turso
  console.log('─'.repeat(65) + '\n');
  console.log('📊 إحصائيات Turso:\n');
  
  const tursoCount = await turso.execute('SELECT COUNT(*) as count FROM movies');
  console.log(`   - إجمالي الأفلام في Turso: ${tursoCount.rows[0].count}\n`);
  
  // Check oldest and newest movies in Turso
  const oldestMovie = await turso.execute('SELECT tmdb_id, title_ar, created_at FROM movies ORDER BY created_at ASC LIMIT 1');
  const newestMovie = await turso.execute('SELECT tmdb_id, title_ar, created_at FROM movies ORDER BY created_at DESC LIMIT 1');
  
  if (oldestMovie.rows.length > 0) {
    console.log('📅 أقدم فيلم في Turso:');
    console.log(`   - ${oldestMovie.rows[0].title_ar} (${oldestMovie.rows[0].created_at})\n`);
  }
  
  if (newestMovie.rows.length > 0) {
    console.log('📅 أحدث فيلم في Turso:');
    console.log(`   - ${newestMovie.rows[0].title_ar} (${newestMovie.rows[0].created_at})\n`);
  }
}

analyzeSyncHistory().catch(console.error);
