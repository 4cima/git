const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function analyzeRealDatabase() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('         تشخيص: القاعدة الحقيقية (data/4cima-local.db)');
  console.log('═════════════════════════════════════════════════════════════\n');

  const realDb = new Database('./data/4cima-local.db');
  
  // 1. Schema comparison
  console.log('📋 مقارنة Schema:\n');
  
  const localMoviesSchema = realDb.prepare("PRAGMA table_info(movies)").all();
  const tursoMoviesSchema = await turso.execute("PRAGMA table_info(movies)");
  
  const localColumns = new Set(localMoviesSchema.map(c => c.name));
  const tursoColumns = new Set(tursoMoviesSchema.rows.map(c => c.name));
  
  // Columns in local but not in Turso
  const onlyInLocal = [...localColumns].filter(c => !tursoColumns.has(c));
  // Columns in Turso but not in local
  const onlyInTurso = [...tursoColumns].filter(c => !localColumns.has(c));
  
  console.log(`📊 جدول movies:`);
  console.log(`   - local.db: ${localColumns.size} عمود`);
  console.log(`   - Turso: ${tursoColumns.size} عمود\n`);
  
  if (onlyInLocal.length > 0) {
    console.log(`⚠️ أعمدة موجودة في local فقط (${onlyInLocal.length}):`);
    onlyInLocal.forEach(col => console.log(`   - ${col}`));
    console.log('');
  }
  
  if (onlyInTurso.length > 0) {
    console.log(`⚠️ أعمدة موجودة في Turso فقط (${onlyInTurso.length}):`);
    onlyInTurso.forEach(col => console.log(`   - ${col}`));
    console.log('');
  }
  
  if (onlyInLocal.length === 0 && onlyInTurso.length === 0) {
    console.log('✅ الـ Schema متطابق تماماً!\n');
  }
  
  console.log('─'.repeat(65) + '\n');
  
  // 2. Data counts and sync status
  console.log('📊 إحصائيات البيانات:\n');
  
  const totalMovies = realDb.prepare('SELECT COUNT(*) as count FROM movies').get();
  console.log(`إجمالي الأفلام في local.db: ${totalMovies.count.toLocaleString()}`);
  
  const hasIsComplete = localMoviesSchema.some(col => col.name === 'is_complete');
  const hasSyncedToTurso = localMoviesSchema.some(col => col.name === 'synced_to_turso');
  const hasFilterStatus = localMoviesSchema.some(col => col.name === 'filter_status');
  
  if (hasIsComplete) {
    const completeMovies = realDb.prepare('SELECT COUNT(*) as count FROM movies WHERE is_complete = 1').get();
    console.log(`أفلام مكتملة (is_complete = 1): ${completeMovies.count.toLocaleString()}`);
  } else {
    console.log('⚠️ عمود is_complete غير موجود');
  }
  
  if (hasFilterStatus) {
    const cleanMovies = realDb.prepare("SELECT COUNT(*) as count FROM movies WHERE filter_status IN ('clean', 'reviewed_approved')").get();
    console.log(`أفلام نظيفة (clean/reviewed_approved): ${cleanMovies.count.toLocaleString()}`);
  } else {
    console.log('⚠️ عمود filter_status غير موجود');
  }
  
  if (hasSyncedToTurso) {
    const syncedMovies = realDb.prepare('SELECT COUNT(*) as count FROM movies WHERE synced_to_turso = 1').get();
    console.log(`أفلام متزامنة مع Turso: ${syncedMovies.count.toLocaleString()}`);
    
    if (hasIsComplete && hasFilterStatus) {
      const pendingSync = realDb.prepare(`
        SELECT COUNT(*) as count FROM movies 
        WHERE is_complete = 1 
        AND filter_status IN ('clean', 'reviewed_approved') 
        AND synced_to_turso = 0
      `).get();
      console.log(`أفلام جاهزة للمزامنة (لم تُرسل بعد): ${pendingSync.count.toLocaleString()}`);
    }
    
    const lastSync = realDb.prepare('SELECT MAX(synced_at) as last_sync FROM movies WHERE synced_to_turso = 1').get();
    if (lastSync.last_sync) {
      console.log(`\n📅 آخر مزامنة: ${lastSync.last_sync}`);
    }
  } else {
    console.log('⚠️ عمود synced_to_turso غير موجود');
  }
  
  const tursoCount = await turso.execute('SELECT COUNT(*) as count FROM movies');
  console.log(`\nإجمالي الأفلام في Turso: ${tursoCount.rows[0].count.toLocaleString()}`);
  
  console.log('\n─'.repeat(65) + '\n');
  
  // 3. Language data availability
  console.log('🌍 توفر بيانات اللغة:\n');
  
  const hasOriginalLanguage = localMoviesSchema.some(col => col.name === 'original_language');
  
  if (hasOriginalLanguage) {
    const withLang = realDb.prepare('SELECT COUNT(*) as count FROM movies WHERE original_language IS NOT NULL').get();
    console.log(`✅ عمود original_language موجود في local.db`);
    console.log(`   أفلام لديها بيانات لغة: ${withLang.count.toLocaleString()} من ${totalMovies.count.toLocaleString()}`);
    
    // Language breakdown
    const langBreakdown = realDb.prepare(`
      SELECT original_language, COUNT(*) as count 
      FROM movies 
      WHERE original_language IS NOT NULL
      GROUP BY original_language 
      ORDER BY count DESC
      LIMIT 15
    `).all();
    
    console.log('\n   أكثر اللغات شيوعاً:');
    langBreakdown.forEach(lang => {
      console.log(`   - ${lang.original_language}: ${lang.count.toLocaleString()}`);
    });
  } else {
    console.log('❌ عمود original_language غير موجود في local.db');
  }
  
  console.log('\n─'.repeat(65) + '\n');
  
  console.log('💡 الخلاصة النهائية:\n');
  console.log('   1. القاعدة الحقيقية موجودة في data/4cima-local.db');
  console.log('   2. local.db في المجلد الرئيسي فارغة (0 bytes)');
  console.log('   3. script 3-sync-to-turso.js يبحث عن local.db في المجلد الرئيسي');
  console.log('   4. لهذا السبب Turso فيها 483 فيلم فقط (تم ملؤها يدوياً للاختبار)\n');
  
  realDb.close();
}

analyzeRealDatabase().catch(console.error);
