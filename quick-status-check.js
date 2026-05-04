const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db');

console.log('🔍 فحص سريع للحالة الحالية\n');

// الأفلام
const moviesTotal = db.prepare('SELECT COUNT(*) as c FROM movies').get().c;
const moviesFetched = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL').get().c;
const moviesComplete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 1').get().c;
const moviesFiltered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1').get().c;
const moviesIncomplete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 0 AND is_filtered = 0').get().c;

console.log('🎬 الأفلام:');
console.log(`  إجمالي: ${moviesTotal.toLocaleString()}`);
console.log(`  مسحوب: ${moviesFetched.toLocaleString()} (${(moviesFetched/moviesTotal*100).toFixed(1)}%)`);
console.log(`  مكتمل: ${moviesComplete.toLocaleString()} (${(moviesComplete/moviesFetched*100).toFixed(1)}% من المسحوب)`);
console.log(`  مفلتر: ${moviesFiltered.toLocaleString()} (${(moviesFiltered/moviesTotal*100).toFixed(1)}%)`);
console.log(`  غير مكتمل: ${moviesIncomplete.toLocaleString()} (${(moviesIncomplete/moviesTotal*100).toFixed(1)}%)`);

// أسباب الفلترة للأفلام
console.log('\n📋 أسباب فلترة الأفلام:');
const movieFilterReasons = db.prepare(`
  SELECT filter_reason, COUNT(*) as count 
  FROM movies 
  WHERE is_filtered = 1 
  GROUP BY filter_reason 
  ORDER BY count DESC
  LIMIT 5
`).all();

movieFilterReasons.forEach(r => {
  const reason = r.filter_reason || 'NULL';
  console.log(`  - ${reason}: ${r.count.toLocaleString()} (${(r.count/moviesFiltered*100).toFixed(1)}%)`);
});

// المسلسلات
console.log('\n📺 المسلسلات:');
const seriesTotal = db.prepare('SELECT COUNT(*) as c FROM tv_series').get().c;
const seriesFetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NOT NULL').get().c;
const seriesComplete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 1').get().c;
const seriesFiltered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1').get().c;
const seriesIncomplete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_complete = 0 AND is_filtered = 0').get().c;

console.log(`  إجمالي: ${seriesTotal.toLocaleString()}`);
console.log(`  مسحوب: ${seriesFetched.toLocaleString()} (${(seriesFetched/seriesTotal*100).toFixed(1)}%)`);
console.log(`  مكتمل: ${seriesComplete.toLocaleString()} (${(seriesComplete/seriesFetched*100).toFixed(1)}% من المسحوب)`);
console.log(`  مفلتر: ${seriesFiltered.toLocaleString()} (${(seriesFiltered/seriesTotal*100).toFixed(1)}%)`);
console.log(`  غير مكتمل: ${seriesIncomplete.toLocaleString()} (${(seriesIncomplete/seriesTotal*100).toFixed(1)}%)`);

// أسباب الفلترة للمسلسلات
console.log('\n📋 أسباب فلترة المسلسلات:');
const seriesFilterReasons = db.prepare(`
  SELECT filter_reason, COUNT(*) as count 
  FROM tv_series 
  WHERE is_filtered = 1 
  GROUP BY filter_reason 
  ORDER BY count DESC
  LIMIT 5
`).all();

seriesFilterReasons.forEach(r => {
  const reason = r.filter_reason || 'NULL';
  console.log(`  - ${reason}: ${r.count.toLocaleString()} (${(r.count/seriesFiltered*100).toFixed(1)}%)`);
});

// Turso
console.log('\n☁️  Turso:');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  try {
    const tursoMovies = await turso.execute('SELECT COUNT(*) as total FROM movies');
    const tursoSeries = await turso.execute('SELECT COUNT(*) as total FROM tv_series');
    
    console.log(`  الأفلام: ${tursoMovies.rows[0].total.toLocaleString()}`);
    console.log(`  المسلسلات: ${tursoSeries.rows[0].total.toLocaleString()}`);
    
    console.log('\n📊 الفرق (غير مزامن):');
    console.log(`  الأفلام: ${(moviesComplete - tursoMovies.rows[0].total).toLocaleString()}`);
    console.log(`  المسلسلات: ${(seriesComplete - tursoSeries.rows[0].total).toLocaleString()}`);
  } catch (e) {
    console.log('  خطأ في الاتصال بـ Turso');
  }
  
  db.close();
})();
