require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/services/local-db');

const REFRESH_INTERVAL = 30000; // 30 ثانية

let lastMovieCount = 0;
let lastSeriesCount = 0;
let lastCheck = Date.now();

function getStats() {
  const movieStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_complete = 1 THEN 1 END) as complete,
      COUNT(CASE WHEN is_filtered = 1 THEN 1 END) as filtered,
      COUNT(CASE WHEN overview_en IS NOT NULL THEN 1 END) as has_data
    FROM movies
  `).get();
  
  const seriesStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_complete = 1 THEN 1 END) as complete,
      COUNT(CASE WHEN is_filtered = 1 THEN 1 END) as filtered,
      COUNT(CASE WHEN overview_en IS NOT NULL THEN 1 END) as has_data
    FROM tv_series
  `).get();
  
  return { movieStats, seriesStats };
}

function displayStats() {
  // مسح الشاشة في PowerShell
  console.log('\n'.repeat(50)); // تنظيف بسيط
  
  console.log('═'.repeat(70));
  console.log('🔄 مراقبة عملية السحب المباشرة');
  console.log('═'.repeat(70));
  console.log(`⏰ ${new Date().toLocaleString('ar-EG')}\n`);
  
  const { movieStats, seriesStats } = getStats();
  
  // حساب السرعة
  const now = Date.now();
  const elapsed = (now - lastCheck) / 1000 / 60; // minutes
  const movieDelta = movieStats.complete - lastMovieCount;
  const seriesDelta = seriesStats.complete - lastSeriesCount;
  const movieRate = elapsed > 0 ? Math.round(movieDelta / elapsed) : 0;
  const seriesRate = elapsed > 0 ? Math.round(seriesDelta / elapsed) : 0;
  
  lastMovieCount = movieStats.complete;
  lastSeriesCount = seriesStats.complete;
  lastCheck = now;
  
  // عرض إحصائيات الأفلام
  console.log('🎬 الأفلام:');
  console.log('─'.repeat(70));
  console.log(`  إجمالي: ${movieStats.total.toLocaleString()}`);
  console.log(`  مكتمل: ${movieStats.complete.toLocaleString()} (${(movieStats.complete/movieStats.total*100).toFixed(2)}%)`);
  console.log(`  مفلتر: ${movieStats.filtered.toLocaleString()} (${(movieStats.filtered/movieStats.total*100).toFixed(2)}%)`);
  console.log(`  لديه بيانات: ${movieStats.has_data.toLocaleString()} (${(movieStats.has_data/movieStats.total*100).toFixed(2)}%)`);
  console.log(`  السرعة: ${movieRate} فيلم/دقيقة`);
  
  const moviesRemaining = movieStats.total - movieStats.has_data - movieStats.filtered;
  const movieETA = movieRate > 0 ? Math.round(moviesRemaining / movieRate) : 0;
  console.log(`  المتبقي: ${moviesRemaining.toLocaleString()}`);
  console.log(`  الوقت المتوقع: ${Math.floor(movieETA / 60)} ساعة ${movieETA % 60} دقيقة`);
  
  console.log('\n📺 المسلسلات:');
  console.log('─'.repeat(70));
  console.log(`  إجمالي: ${seriesStats.total.toLocaleString()}`);
  console.log(`  مكتمل: ${seriesStats.complete.toLocaleString()} (${(seriesStats.complete/seriesStats.total*100).toFixed(2)}%)`);
  console.log(`  مفلتر: ${seriesStats.filtered.toLocaleString()} (${(seriesStats.filtered/seriesStats.total*100).toFixed(2)}%)`);
  console.log(`  لديه بيانات: ${seriesStats.has_data.toLocaleString()} (${(seriesStats.has_data/seriesStats.total*100).toFixed(2)}%)`);
  console.log(`  السرعة: ${seriesRate} مسلسل/دقيقة`);
  
  const seriesRemaining = seriesStats.total - seriesStats.has_data - seriesStats.filtered;
  const seriesETA = seriesRate > 0 ? Math.round(seriesRemaining / seriesRate) : 0;
  console.log(`  المتبقي: ${seriesRemaining.toLocaleString()}`);
  console.log(`  الوقت المتوقع: ${Math.floor(seriesETA / 60)} ساعة ${seriesETA % 60} دقيقة`);
  
  // آخر الأفلام المكتملة
  console.log('\n📋 آخر 5 أفلام مكتملة:');
  console.log('─'.repeat(70));
  const recentMovies = db.prepare(`
    SELECT title_ar, title_en, vote_average, updated_at
    FROM movies
    WHERE is_complete = 1
    ORDER BY updated_at DESC
    LIMIT 5
  `).all();
  
  recentMovies.forEach(m => {
    console.log(`  ⭐ ${m.vote_average || 0} | ${m.title_ar || m.title_en}`);
  });
  
  console.log('\n' + '═'.repeat(70));
  console.log('⏭️  التحديث التالي خلال 30 ثانية... (Ctrl+C للإيقاف)');
}

// العرض الأولي
displayStats();

// تحديث دوري
setInterval(displayStats, REFRESH_INTERVAL);
