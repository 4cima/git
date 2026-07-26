/**
 * ============================================
 * 🎯 UPDATE EXISTING CONTENT WITH SEO DATA
 * ============================================
 * Purpose: Add SEO data to existing movies and TV series
 * ============================================
 */

const db = require('./services/local-db');
const { generateCompleteSEO } = require('./services/seo-generator');
const pLimit = require('p-limit').default || require('p-limit');

const BATCH_SIZE = 100;
const CONCURRENCY = 10;
const limiter = pLimit(CONCURRENCY);

const stats = {
  movies: { total: 0, updated: 0, errors: 0 },
  series: { total: 0, updated: 0, errors: 0 },
  start: Date.now()
};

/**
 * تحديث بيانات SEO لفيلم
 */
function updateMovieSEO(movie) {
  try {
    const seoData = generateCompleteSEO(movie);
    
    db.prepare(`
      UPDATE movies 
      SET 
        seo_keywords_json = ?,
        seo_title_ar = ?,
        seo_title_en = ?,
        seo_description_ar = ?,
        canonical_url = ?
      WHERE id = ?
    `).run(
      seoData.seo_keywords_json,
      seoData.seo_title_ar,
      seoData.seo_title_en,
      seoData.seo_description_ar,
      seoData.canonical_url,
      movie.id
    );
    
    stats.movies.updated++;
    return true;
  } catch (e) {
    stats.movies.errors++;
    console.error(`❌ Movie ${movie.id}: ${e.message}`);
    return false;
  }
}

/**
 * تحديث بيانات SEO لمسلسل
 */
function updateSeriesSEO(series) {
  try {
    const seoData = generateCompleteSEO(series);
    
    db.prepare(`
      UPDATE tv_series 
      SET 
        seo_keywords_json = ?,
        seo_title_ar = ?,
        seo_title_en = ?,
        seo_description_ar = ?,
        canonical_url = ?
      WHERE id = ?
    `).run(
      seoData.seo_keywords_json,
      seoData.seo_title_ar,
      seoData.seo_title_en,
      seoData.seo_description_ar,
      seoData.canonical_url,
      series.id
    );
    
    stats.series.updated++;
    return true;
  } catch (e) {
    stats.series.errors++;
    console.error(`❌ Series ${series.id}: ${e.message}`);
    return false;
  }
}

/**
 * معالجة دفعة من الأفلام
 */
async function processMoviesBatch(offset) {
  const movies = db.prepare(`
    SELECT 
      id, tmdb_id, slug, title_ar, title_en, title_original,
      overview_ar, release_year, primary_genre, vote_average,
      keywords, content_type
    FROM movies
    WHERE title_ar IS NOT NULL 
    AND title_ar != 'TBD'
    AND slug IS NOT NULL
    LIMIT ? OFFSET ?
  `).all(BATCH_SIZE, offset);

  if (movies.length === 0) return false;

  const updateMovies = db.transaction((movies) => {
    for (const movie of movies) {
      updateMovieSEO(movie);
    }
  });

  updateMovies(movies);
  stats.movies.total += movies.length;

  return movies.length === BATCH_SIZE;
}

/**
 * معالجة دفعة من المسلسلات
 */
async function processSeriesBatch(offset) {
  const series = db.prepare(`
    SELECT 
      id, tmdb_id, slug, title_ar, title_en, title_original,
      overview_ar, first_air_year, primary_genre, vote_average,
      keywords, content_type
    FROM tv_series
    WHERE title_ar IS NOT NULL 
    AND title_ar != 'TBD'
    AND slug IS NOT NULL
    LIMIT ? OFFSET ?
  `).all(BATCH_SIZE, offset);

  if (series.length === 0) return false;

  const updateSeries = db.transaction((series) => {
    for (const s of series) {
      updateSeriesSEO(s);
    }
  });

  updateSeries(series);
  stats.series.total += series.length;

  return series.length === BATCH_SIZE;
}

/**
 * عرض التقدم
 */
function showProgress() {
  const elapsed = ((Date.now() - stats.start) / 1000).toFixed(1);
  const moviesRate = (stats.movies.updated / (elapsed / 60)).toFixed(0);
  const seriesRate = (stats.series.updated / (elapsed / 60)).toFixed(0);
  
  console.log(`\r🎬 ${stats.movies.updated.toLocaleString('ar-EG')} فيلم | 📺 ${stats.series.updated.toLocaleString('ar-EG')} مسلسل | ⏱️ ${elapsed}ث | 🚀 ${moviesRate}+${seriesRate}/دقيقة`);
}

/**
 * البرنامج الرئيسي
 */
async function main() {
  console.log('🎯 بدء تحديث بيانات SEO للمحتوى الموجود...\n');

  // عد المحتوى
  const movieCount = db.prepare(`
    SELECT COUNT(*) as count FROM movies 
    WHERE title_ar IS NOT NULL AND title_ar != 'TBD' AND slug IS NOT NULL
  `).get().count;

  const seriesCount = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series 
    WHERE title_ar IS NOT NULL AND title_ar != 'TBD' AND slug IS NOT NULL
  `).get().count;

  console.log(`📊 المحتوى المتاح:`);
  console.log(`   🎬 ${movieCount.toLocaleString('ar-EG')} فيلم`);
  console.log(`   📺 ${seriesCount.toLocaleString('ar-EG')} مسلسل\n`);

  const progressInterval = setInterval(showProgress, 2000);

  // معالجة الأفلام
  console.log('🎬 معالجة الأفلام...');
  let offset = 0;
  while (await processMoviesBatch(offset)) {
    offset += BATCH_SIZE;
  }

  // معالجة المسلسلات
  console.log('\n📺 معالجة المسلسلات...');
  offset = 0;
  while (await processSeriesBatch(offset)) {
    offset += BATCH_SIZE;
  }

  clearInterval(progressInterval);
  showProgress();

  // النتيجة النهائية
  const elapsed = ((Date.now() - stats.start) / 1000).toFixed(1);
  console.log('\n\n✅ اكتمل التحديث!');
  console.log(`\n📊 الإحصائيات:`);
  console.log(`   🎬 الأفلام: ${stats.movies.updated.toLocaleString('ar-EG')} محدث، ${stats.movies.errors} خطأ`);
  console.log(`   📺 المسلسلات: ${stats.series.updated.toLocaleString('ar-EG')} محدث، ${stats.series.errors} خطأ`);
  console.log(`   ⏱️ الوقت: ${elapsed} ثانية`);
  console.log(`   🚀 المعدل: ${((stats.movies.updated + stats.series.updated) / (elapsed / 60)).toFixed(0)} عنصر/دقيقة`);
}

main().catch(console.error);
