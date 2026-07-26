require('dotenv').config({ path: '.env.local' });
const pLimitModule = require('p-limit');
const pLimit = pLimitModule.default || pLimitModule;
const db = require('./services/local-db');
const { translateField } = require('./services/translation-service');

const limiter = pLimit(10);
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit'));
const BATCH_SIZE = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf(limitArg) + 1], 10) : 500;

const stats = { moviesFixed: 0, moviesStillFailed: 0, seriesFixed: 0, seriesStillFailed: 0 };

async function enrichMovie(movie) {
  try {
    const title_ar = movie.title_ar || await translateField(movie.title_en, null, 'title');
    const overview_ar = movie.overview_ar || await translateField(movie.overview_en, null, 'overview');
    const isComplete = title_ar ? 1 : 0;

    db.prepare(`UPDATE movies SET title_ar=?, overview_ar=?, is_complete=?, updated_at=datetime('now') WHERE tmdb_id=?`)
      .run(title_ar || null, overview_ar || null, isComplete, movie.tmdb_id);

    isComplete ? stats.moviesFixed++ : stats.moviesStillFailed++;
  } catch (err) {
    console.error(`❌ فيلم ${movie.tmdb_id}:`, err.message);
    stats.moviesStillFailed++;
  }
}

async function enrichSeries(series) {
  try {
    const name_ar = series.name_ar || await translateField(series.name_en, null, 'name');
    const overview_ar = series.overview_ar || await translateField(series.overview_en, null, 'overview');
    const isComplete = name_ar ? 1 : 0;

    db.prepare(`UPDATE tv_series SET name_ar=?, overview_ar=?, is_complete=?, updated_at=datetime('now') WHERE tmdb_id=?`)
      .run(name_ar || null, overview_ar || null, isComplete, series.tmdb_id);

    isComplete ? stats.seriesFixed++ : stats.seriesStillFailed++;
  } catch (err) {
    console.error(`❌ مسلسل ${series.tmdb_id}:`, err.message);
    stats.seriesStillFailed++;
  }
}

async function main() {
  console.log('🚀 إكمال السجلات الناقصة\n');

  const movies = db.prepare(`SELECT tmdb_id, title_en, overview_en, title_ar, overview_ar FROM movies WHERE is_complete=0 AND is_filtered=0 AND is_fetched=1 LIMIT ?`).all(BATCH_SIZE);
  console.log(`🎬 ${movies.length} فيلم ناقص`);
  await Promise.all(movies.map(m => limiter(() => enrichMovie(m))));

  const series = db.prepare(`SELECT tmdb_id, name_en, overview_en, name_ar, overview_ar FROM tv_series WHERE is_complete=0 AND is_filtered=0 AND is_fetched=1 LIMIT ?`).all(BATCH_SIZE);
  console.log(`📺 ${series.length} مسلسل ناقص`);
  await Promise.all(series.map(s => limiter(() => enrichSeries(s))));

  console.log(`\n✅ أفلام: ${stats.moviesFixed} تمت | ${stats.moviesStillFailed} لسه فاشلة`);
  console.log(`✅ مسلسلات: ${stats.seriesFixed} تمت | ${stats.seriesStillFailed} لسه فاشلة`);
}

main().catch(err => { console.error('❌ خطأ فادح:', err); process.exit(1); });
