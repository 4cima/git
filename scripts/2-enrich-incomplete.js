require('dotenv').config({ path: '.env.local' });
const pLimitModule = require('p-limit');
const pLimit = pLimitModule.default || pLimitModule;
const db = require('./services/local-db');
const { translateField } = require('./services/translation-service');
const { shouldRejectWork } = require('./services/content-filter');

const limiter = pLimit(10);
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit'));
const BATCH_SIZE = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf(limitArg) + 1], 10) : 500;

const stats = { moviesFixed: 0, moviesStillFailed: 0, moviesPolicyBlocked: 0, seriesFixed: 0, seriesStillFailed: 0, seriesPolicyBlocked: 0 };

/* جولة السياسة: لا يكتمل أبداً ما ترفضه shouldRejectWork على الصف المخزون.
   جولة keywords: الكلمات المخزّنة في keywords_json تُحمَّل في content قبل الفحص —
   باب keyword/erotic_genre يعمل الآن من التخزين (بلا نداء حي بعد الإثراء). */
function policyRejectFromRow(row, mediaType) {
  let storedKeywords = []
  if (row.keywords_json) {
    try { storedKeywords = JSON.parse(row.keywords_json) || [] } catch { storedKeywords = [] }
  }
  const content = mediaType === 'tv'
    ? {
        id: row.tmdb_id, name: row.name_en, name_original: row.name_original,
        overview: row.overview_en || row.overview_ar || '',
        first_air_date: row.first_air_date, first_air_year: row.first_air_year,
        age_rating: row.age_rating, production_companies: row.production_companies,
        vote_count: row.vote_count,
        keywords: { results: storedKeywords },
      }
    : {
        id: row.tmdb_id, title: row.title_en, title_original: row.title_original,
        overview: row.overview_en || row.overview_ar || '',
        release_date: row.release_date, release_year: row.release_year,
        runtime: row.runtime, age_rating: row.age_rating,
        production_companies: row.production_companies, vote_count: row.vote_count,
        keywords: { keywords: storedKeywords },
      }
  if (typeof content.production_companies === 'string') {
    try { content.production_companies = JSON.parse(content.production_companies) } catch { content.production_companies = [] }
  }
  return shouldRejectWork(content, { mediaType, mode: 'ingest' })
}

async function enrichMovie(movie) {
  try {
    // جولة السياسة: الصف المرفوض بالسياسة لا يُكمل — يُعلَّم blocked
    const policy = policyRejectFromRow(movie, 'movie')
    if (policy.reject) {
      db.prepare(`UPDATE movies SET is_filtered=1, filter_status='blocked', filter_reason=?, is_complete=0, updated_at=datetime('now') WHERE tmdb_id=?`)
        .run(policy.reason, movie.tmdb_id);
      stats.moviesPolicyBlocked++;
      return;
    }

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
    const policy = policyRejectFromRow(series, 'tv')
    if (policy.reject) {
      db.prepare(`UPDATE tv_series SET is_filtered=1, filter_status='blocked', filter_reason=?, is_complete=0, updated_at=datetime('now') WHERE tmdb_id=?`)
        .run(policy.reason, series.tmdb_id);
      stats.seriesPolicyBlocked++;
      return;
    }

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

  // جولة السياسة: لا يُلمس المحجوب (blocked) ولا المرفوض — فقط النظيف/بحاجة مراجعة/بلا حالة
  const movies = db.prepare(`SELECT tmdb_id, title_en, title_original, overview_en, title_ar, overview_ar, release_date, release_year, runtime, vote_count, age_rating, production_companies, keywords_json FROM movies WHERE is_complete=0 AND is_filtered=0 AND is_fetched=1 AND (filter_status IS NULL OR filter_status IN ('clean','needs_review')) LIMIT ?`).all(BATCH_SIZE);
  console.log(`🎬 ${movies.length} فيلم ناقص`);
  await Promise.all(movies.map(m => limiter(() => enrichMovie(m))));

  const series = db.prepare(`SELECT tmdb_id, name_en, name_original, overview_en, name_ar, overview_ar, first_air_date, first_air_year, vote_count, age_rating, production_companies, keywords_json FROM tv_series WHERE is_complete=0 AND is_filtered=0 AND is_fetched=1 AND (filter_status IS NULL OR filter_status IN ('clean','needs_review')) LIMIT ?`).all(BATCH_SIZE);
  console.log(`📺 ${series.length} مسلسل ناقص`);
  await Promise.all(series.map(s => limiter(() => enrichSeries(s))));

  console.log(`\n✅ أفلام: ${stats.moviesFixed} تمت | ${stats.moviesStillFailed} لسه فاشلة | ${stats.moviesPolicyBlocked} حُجبت بالسياسة`);
  console.log(`✅ مسلسلات: ${stats.seriesFixed} تمت | ${stats.seriesStillFailed} لسه فاشلة | ${stats.seriesPolicyBlocked} حُجبت بالسياسة`);
}

main().catch(err => { console.error('❌ خطأ فادح:', err); process.exit(1); });

