require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const db = new Database('./data/4cima-local.db');

async function generateReport() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const timestamp = new Date().toLocaleString('ar-EG');
  const timeISO = new Date().toISOString();

  // SQLite
  const sqliteMovies = db.prepare('SELECT COUNT(*) as total FROM movies WHERE is_complete = 1').get();
  const sqliteSeries = db.prepare('SELECT COUNT(*) as total FROM tv_series WHERE is_complete = 1').get();

  // Turso
  const tursoMovies = await turso.execute('SELECT COUNT(*) as total FROM movies');
  const tursoSeries = await turso.execute('SELECT COUNT(*) as total FROM tv_series');

  const moviesDiff = sqliteMovies.total - tursoMovies.rows[0].total;
  const seriesDiff = sqliteSeries.total - tursoSeries.rows[0].total;

  const report = {
    timestamp,
    timeISO,
    sqlite: {
      movies: sqliteMovies.total,
      series: sqliteSeries.total,
    },
    turso: {
      movies: tursoMovies.rows[0].total,
      series: tursoSeries.rows[0].total,
    },
    diff: {
      movies: moviesDiff,
      moviesPercent: (moviesDiff / sqliteMovies.total * 100).toFixed(1),
      series: seriesDiff,
      seriesPercent: (seriesDiff / sqliteSeries.total * 100).toFixed(1),
    },
  };

  // Save to file
  const reportPath = path.join('monitoring-reports', `report-${timeISO.replace(/[:.]/g, '-')}.json`);
  
  if (!fs.existsSync('monitoring-reports')) {
    fs.mkdirSync('monitoring-reports');
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print to console
  console.clear();
  console.log('🔍 مراقبة العمليات - ' + timestamp);
  console.log('═'.repeat(80));
  console.log('\n📊 البيانات المحلية (SQLite):');
  console.log(`  🎬 الأفلام المكتملة: ${report.sqlite.movies.toLocaleString('ar-EG')}`);
  console.log(`  📺 المسلسلات المكتملة: ${report.sqlite.series.toLocaleString('ar-EG')}`);

  console.log('\n☁️  البيانات في Turso:');
  console.log(`  🎬 الأفلام: ${report.turso.movies.toLocaleString('ar-EG')}`);
  console.log(`  📺 المسلسلات: ${report.turso.series.toLocaleString('ar-EG')}`);

  console.log('\n📈 الفرق (غير مزامن):');
  console.log(`  🎬 الأفلام: ${report.diff.movies.toLocaleString('ar-EG')} (${report.diff.moviesPercent}%)`);
  console.log(`  📺 المسلسلات: ${report.diff.series.toLocaleString('ar-EG')} (${report.diff.seriesPercent}%)`);

  console.log('\n═'.repeat(80));
  console.log('✅ تم حفظ التقرير في: ' + reportPath);
  console.log('⏰ آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG'));
}

// Run immediately
generateReport().catch(console.error);

// Then every 10 minutes
setInterval(() => {
  generateReport().catch(console.error);
}, 10 * 60 * 1000);

console.log('🚀 بدء المراقبة الدورية (كل 10 دقائق)');
