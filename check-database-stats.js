const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function checkDatabases() {
  console.log('\n🔍 جاري فحص قواعد البيانات...\n');
  
  // 1. فحص قاعدة البيانات المحلية (SQLite)
  console.log('=' .repeat(50));
  console.log('📦 قاعدة البيانات المحلية (SQLite - local.db)');
  console.log('=' .repeat(50));
  
  try {
    const localDb = new Database('./local.db', { readonly: true });
    
    // التحقق من وجود الجداول أولاً
    const tables = localDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    
    if (!tableNames.includes('movies') && !tableNames.includes('tv_series')) {
      console.log('⚠️  قاعدة البيانات المحلية فارغة أو غير مهيأة');
      console.log('📋 الجداول الموجودة:', tableNames.join(', ') || 'لا يوجد');
      localDb.close();
    } else {
      const moviesCount = tableNames.includes('movies') ? 
        localDb.prepare('SELECT COUNT(*) as count FROM movies').get() : { count: 0 };
      const seriesCount = tableNames.includes('tv_series') ? 
        localDb.prepare('SELECT COUNT(*) as count FROM tv_series').get() : { count: 0 };
      
      console.log('🎬 عدد الأفلام:', moviesCount.count.toLocaleString('ar-EG'));
      console.log('📺 عدد المسلسلات:', seriesCount.count.toLocaleString('ar-EG'));
      console.log('📊 الإجمالي:', (moviesCount.count + seriesCount.count).toLocaleString('ar-EG'));
      
      // إحصائيات إضافية
      if (tableNames.includes('movies')) {
        try {
          const movies2026 = localDb.prepare("SELECT COUNT(*) as count FROM movies WHERE substr(release_date, 1, 4) = '2026'").get();
          console.log('\n📅 أفلام 2026:', movies2026.count.toLocaleString('ar-EG'));
        } catch (e) {
          console.log('\n📅 أفلام 2026: (غير متاح)');
        }
        
        try {
          const topMovies = localDb.prepare('SELECT COUNT(*) as count FROM movies WHERE vote_average >= 7.0').get();
          console.log('⭐ أفلام عالية التقييم (7.0+):', topMovies.count.toLocaleString('ar-EG'));
        } catch (e) {
          console.log('⭐ أفلام عالية التقييم: (غير متاح)');
        }
      }
      
      localDb.close();
      console.log('\n✅ تم فحص قاعدة البيانات المحلية بنجاح');
    }
  } catch (error) {
    console.error('❌ خطأ في قاعدة البيانات المحلية:', error.message);
  }
  
  // 2. فحص قاعدة بيانات Turso
  console.log('\n' + '='.repeat(50));
  console.log('☁️  قاعدة بيانات Turso (Cloud)');
  console.log('=' .repeat(50));
  
  try {
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    const tursoMoviesResult = await turso.execute('SELECT COUNT(*) as count FROM movies');
    const tursoSeriesResult = await turso.execute('SELECT COUNT(*) as count FROM tv_series');
    
    const tursoMoviesCount = tursoMoviesResult.rows[0].count;
    const tursoSeriesCount = tursoSeriesResult.rows[0].count;
    
    console.log('🎬 عدد الأفلام:', Number(tursoMoviesCount).toLocaleString('ar-EG'));
    console.log('📺 عدد المسلسلات:', Number(tursoSeriesCount).toLocaleString('ar-EG'));
    console.log('📊 الإجمالي:', (Number(tursoMoviesCount) + Number(tursoSeriesCount)).toLocaleString('ar-EG'));
    
    // إحصائيات إضافية
    try {
      const tursoMovies2026 = await turso.execute("SELECT COUNT(*) as count FROM movies WHERE substr(release_date, 1, 4) = '2026'");
      const tursoSeries2026 = await turso.execute("SELECT COUNT(*) as count FROM tv_series WHERE substr(first_air_date, 1, 4) = '2026'");
      
      console.log('\n📅 أعمال 2026:');
      console.log('  🎬 أفلام 2026:', Number(tursoMovies2026.rows[0].count).toLocaleString('ar-EG'));
      console.log('  📺 مسلسلات 2026:', Number(tursoSeries2026.rows[0].count).toLocaleString('ar-EG'));
      console.log('  📊 إجمالي 2026:', (Number(tursoMovies2026.rows[0].count) + Number(tursoSeries2026.rows[0].count)).toLocaleString('ar-EG'));
    } catch (e) {
      console.log('\n📅 أعمال 2026: (غير متاح)');
    }
    
    // أعلى تقييم
    try {
      const tursoTopMovies = await turso.execute('SELECT COUNT(*) as count FROM movies WHERE vote_average >= 7.0');
      const tursoTopSeries = await turso.execute('SELECT COUNT(*) as count FROM tv_series WHERE vote_average >= 7.0');
      
      console.log('\n⭐ أعمال عالية التقييم (7.0+):');
      console.log('  🎬 أفلام:', Number(tursoTopMovies.rows[0].count).toLocaleString('ar-EG'));
      console.log('  📺 مسلسلات:', Number(tursoTopSeries.rows[0].count).toLocaleString('ar-EG'));
    } catch (e) {
      console.log('\n⭐ أعمال عالية التقييم: (غير متاح)');
    }
    
    console.log('\n✅ تم فحص قاعدة بيانات Turso بنجاح');
  } catch (error) {
    console.error('❌ خطأ في قاعدة بيانات Turso:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ اكتمل الفحص!');
  console.log('='.repeat(50) + '\n');
}

checkDatabases().catch(console.error);
