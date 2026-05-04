#!/usr/bin/env node
/**
 * 📊 مراقبة شاملة لجميع العمليات
 */

require('dotenv').config({ path: './.env.local' });
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./data/4cima-local.db');

function formatNumber(num) {
  return num.toLocaleString('ar-SA');
}

function getStats() {
  const stats = {
    movies: {
      total: db.prepare('SELECT COUNT(*) as c FROM movies').get().c,
      fetched: db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL').get().c,
      complete: db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 1').get().c,
      filtered: db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1').get().c,
      incomplete: db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 0 AND is_filtered = 0').get().c,
    },
    series: {
      total: db.prepare('SELECT COUNT(*) as c FROM tv_series').get().c,
      fetched: db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NOT NULL').get().c,
      complete: db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 1').get().c,
      filtered: db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1').get().c,
      incomplete: db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 0 AND is_filtered = 0').get().c,
    }
  };
  
  return stats;
}

function printStats() {
  console.clear();
  console.log('📊 مراقبة شاملة لجميع العمليات\n');
  console.log('═'.repeat(120));
  console.log(`⏰ الوقت: ${new Date().toLocaleString('ar-SA')}\n`);
  
  const stats = getStats();
  
  // الأفلام
  console.log('🎬 الأفلام:\n');
  console.log(`  📊 إجمالي: ${formatNumber(stats.movies.total)}`);
  console.log(`  📥 مسحوب: ${formatNumber(stats.movies.fetched)} (${(stats.movies.fetched/stats.movies.total*100).toFixed(1)}%)`);
  console.log(`  ✅ مكتمل: ${formatNumber(stats.movies.complete)} (${(stats.movies.complete/stats.movies.fetched*100).toFixed(1)}% من المسحوب)`);
  console.log(`  🚫 مفلتر: ${formatNumber(stats.movies.filtered)} (${(stats.movies.filtered/stats.movies.total*100).toFixed(1)}%)`);
  console.log(`  ⏳ غير مكتمل: ${formatNumber(stats.movies.incomplete)} (${(stats.movies.incomplete/stats.movies.fetched*100).toFixed(1)}% من المسحوب)`);
  
  // المسلسلات
  console.log('\n📺 المسلسلات:\n');
  console.log(`  📊 إجمالي: ${formatNumber(stats.series.total)}`);
  console.log(`  📥 مسحوب: ${formatNumber(stats.series.fetched)} (${(stats.series.fetched/stats.series.total*100).toFixed(1)}%)`);
  console.log(`  ✅ مكتمل: ${formatNumber(stats.series.complete)} (${(stats.series.complete/stats.series.fetched*100).toFixed(1)}% من المسحوب)`);
  console.log(`  🚫 مفلتر: ${formatNumber(stats.series.filtered)} (${(stats.series.filtered/stats.series.total*100).toFixed(1)}%)`);
  console.log(`  ⏳ غير مكتمل: ${formatNumber(stats.series.incomplete)} (${(stats.series.incomplete/stats.series.fetched*100).toFixed(1)}% من المسحوب)`);
  
  // جودة البيانات
  console.log('\n📈 جودة البيانات (بناءً على المسحوب فقط):\n');
  const moviesQuality = (stats.movies.complete / stats.movies.fetched * 100).toFixed(1);
  const seriesQuality = (stats.series.complete / stats.series.fetched * 100).toFixed(1);
  console.log(`  🎬 الأفلام: ${moviesQuality}%`);
  console.log(`  📺 المسلسلات: ${seriesQuality}%`);
  
  console.log('\n' + '═'.repeat(120));
  console.log('\n🔄 العمليات الجارية:');
  console.log('  - ترجمة الأسماء المفقودة (ID: 47)');
  console.log('  - إنقاذ المحتوى المفلتر (ID: 46)');
  console.log('  - ترجمة الأوصاف المفقودة (ID: 48)');
  console.log('  - جلب الملصقات المفقودة (ID: 49)');
  console.log('  - توليد الأوصاف بالذكاء الاصطناعي (ID: 50)');
  console.log('  - سحب الأفلام من TMDB (ID: 51)');
  console.log('  - سحب المسلسلات من TMDB (ID: 52)');
  console.log('  - مزامنة المسلسلات (ID: 41)');
  
  console.log('\n⏳ سيتم التحديث كل 30 ثانية...\n');
}

// طباعة أولية
printStats();

// تحديث دوري
setInterval(printStats, 30000);

// حفظ التقرير كل 5 دقائق
setInterval(() => {
  const stats = getStats();
  const report = {
    timestamp: new Date().toISOString(),
    movies: stats.movies,
    series: stats.series,
    quality: {
      movies: (stats.movies.complete / stats.movies.fetched * 100).toFixed(1),
      series: (stats.series.complete / stats.series.fetched * 100).toFixed(1)
    }
  };
  
  const reportPath = path.join(__dirname, 'monitoring-reports', `report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}, 300000);

// معالج الإغلاق
process.on('SIGINT', () => {
  console.log('\n\n✅ تم إيقاف المراقبة');
  db.close();
  process.exit(0);
});
