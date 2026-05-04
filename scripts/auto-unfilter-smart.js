// auto-unfilter-smart.js
// إعادة تقييم الأعمال المفلترة بذكاء - مع استثناء الحالات النهائية

require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');
const { shouldFilterContent, getFilterReason } = require('./services/content-filter');
const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

// ============================================================
// الحالات النهائية - لا تُعاد معالجتها أبداً
// ============================================================
const PERMANENT_FILTER_REASONS = [
  'adult_flag',
  'hard_explicit:porn',
  'hard_explicit:porno',
  'hard_explicit:pornography',
  'hard_explicit:xxx',
  'hard_explicit:hentai',
  'hard_explicit:erotic',
  'hard_explicit:hardcore',
  'hard_explicit:softcore',
  'hard_explicit:adult film',
  'hard_explicit:sex tape'
];

// ============================================================
// الحالات القابلة لإعادة التقييم
// ============================================================
const REEVALUATE_FILTER_REASONS = [
  'low_votes',      // قد تزيد التصويتات
  'low_rating',     // قد يتحسن التقييم
  'no_poster',      // قد يُضاف poster
  'no_overview',    // قد تُضاف نبذة
  'mild_in_overview', // قد يتغير السياق
  'mild_in_title'   // قد يتغير السياق
];

console.log('🔄 إعادة تقييم الأعمال المفلترة بذكاء\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// ============================================================
// STEP 1: تحليل الأعمال المفلترة
// ============================================================
console.log('📊 تحليل الأعمال المفلترة:\n');

const analysis = db.prepare(`
  SELECT 
    'Movies' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN filter_reason IN (${PERMANENT_FILTER_REASONS.map(() => '?').join(',')}) THEN 1 END) as permanent,
    COUNT(CASE WHEN filter_reason IN (${REEVALUATE_FILTER_REASONS.map(() => '?').join(',')}) THEN 1 END) as reevaluate,
    COUNT(CASE WHEN filter_reason NOT IN (${[...PERMANENT_FILTER_REASONS, ...REEVALUATE_FILTER_REASONS].map(() => '?').join(',')}) THEN 1 END) as other
  FROM movies
  WHERE is_filtered = 1
  UNION ALL
  SELECT 
    'TV Series' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN filter_reason IN (${PERMANENT_FILTER_REASONS.map(() => '?').join(',')}) THEN 1 END) as permanent,
    COUNT(CASE WHEN filter_reason IN (${REEVALUATE_FILTER_REASONS.map(() => '?').join(',')}) THEN 1 END) as reevaluate,
    COUNT(CASE WHEN filter_reason NOT IN (${[...PERMANENT_FILTER_REASONS, ...REEVALUATE_FILTER_REASONS].map(() => '?').join(',')}) THEN 1 END) as other
  FROM tv_series
  WHERE is_filtered = 1
`).all(
  ...PERMANENT_FILTER_REASONS,
  ...REEVALUATE_FILTER_REASONS,
  ...PERMANENT_FILTER_REASONS, ...REEVALUATE_FILTER_REASONS,
  ...PERMANENT_FILTER_REASONS,
  ...REEVALUATE_FILTER_REASONS,
  ...PERMANENT_FILTER_REASONS, ...REEVALUATE_FILTER_REASONS
);

analysis.forEach(a => {
  console.log(`${a.type}:`);
  console.log(`  إجمالي المفلتر: ${a.total.toLocaleString()}`);
  console.log(`  🔒 نهائي (لا يُعاد): ${a.permanent.toLocaleString()}`);
  console.log(`  🔄 قابل لإعادة التقييم: ${a.reevaluate.toLocaleString()}`);
  console.log(`  ❓ أخرى: ${a.other.toLocaleString()}\n`);
});

// ============================================================
// STEP 2: جلب الأعمال القابلة لإعادة التقييم
// ============================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 جلب الأعمال القابلة لإعادة التقييم:\n');

const moviesToReevaluate = db.prepare(`
  SELECT id, title_en, filter_reason, vote_count, vote_average
  FROM movies
  WHERE is_filtered = 1
    AND filter_reason IN (${REEVALUATE_FILTER_REASONS.map(() => '?').join(',')})
  ORDER BY vote_count DESC
  LIMIT 1000
`).all(...REEVALUATE_FILTER_REASONS);

const seriesToReevaluate = db.prepare(`
  SELECT id, title_en, filter_reason, vote_count, vote_average
  FROM tv_series
  WHERE is_filtered = 1
    AND filter_reason IN (${REEVALUATE_FILTER_REASONS.map(() => '?').join(',')})
  ORDER BY vote_count DESC
  LIMIT 1000
`).all(...REEVALUATE_FILTER_REASONS);

console.log(`🎬 أفلام للتقييم: ${moviesToReevaluate.length.toLocaleString()}`);
console.log(`📺 مسلسلات للتقييم: ${seriesToReevaluate.length.toLocaleString()}\n`);

// ============================================================
// STEP 3: إعادة تقييم الأفلام
// ============================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('🎬 إعادة تقييم الأفلام:\n');

let stats = {
  movies: { checked: 0, unfiltered: 0, still_filtered: 0, errors: 0 },
  series: { checked: 0, unfiltered: 0, still_filtered: 0, errors: 0 }
};

async function fetchTMDB(endpoint) {
  try {
    const response = await axios.get(`${TMDB_BASE}${endpoint}`, {
      params: { api_key: TMDB_API_KEY },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

async function reevaluateMovie(id) {
  try {
    const movieData = await fetchTMDB(`/movie/${id}`);
    if (!movieData) {
      stats.movies.errors++;
      return;
    }

    // تحديث البيانات في قاعدة البيانات
    db.prepare(`
      UPDATE movies 
      SET vote_count = ?, vote_average = ?, poster_path = ?, overview_en = ?
      WHERE id = ?
    `).run(
      movieData.vote_count || 0,
      movieData.vote_average || 0,
      movieData.poster_path,
      movieData.overview,
      id
    );

    // إعادة تقييم الفلترة
    if (!shouldFilterContent(movieData)) {
      // فك الفلترة
      db.prepare(`
        UPDATE movies 
        SET is_filtered = 0, filter_reason = NULL
        WHERE id = ?
      `).run(id);
      
      stats.movies.unfiltered++;
      console.log(`  ✅ تم فك فلترة: ${movieData.title} (votes: ${movieData.vote_count}, rating: ${movieData.vote_average})`);
    } else {
      stats.movies.still_filtered++;
    }

    stats.movies.checked++;
  } catch (error) {
    stats.movies.errors++;
  }
}

async function reevaluateSeries(id) {
  try {
    const seriesData = await fetchTMDB(`/tv/${id}`);
    if (!seriesData) {
      stats.series.errors++;
      return;
    }

    // تحديث البيانات
    db.prepare(`
      UPDATE tv_series 
      SET vote_count = ?, vote_average = ?, poster_path = ?, overview_en = ?
      WHERE id = ?
    `).run(
      seriesData.vote_count || 0,
      seriesData.vote_average || 0,
      seriesData.poster_path,
      seriesData.overview,
      id
    );

    // إعادة تقييم الفلترة
    if (!shouldFilterContent(seriesData)) {
      // فك الفلترة
      db.prepare(`
        UPDATE tv_series 
        SET is_filtered = 0, filter_reason = NULL
        WHERE id = ?
      `).run(id);
      
      stats.series.unfiltered++;
      console.log(`  ✅ تم فك فلترة: ${seriesData.name} (votes: ${seriesData.vote_count}, rating: ${seriesData.vote_average})`);
    } else {
      stats.series.still_filtered++;
    }

    stats.series.checked++;
  } catch (error) {
    stats.series.errors++;
  }
}

// معالجة الأفلام
async function processMovies() {
  for (const movie of moviesToReevaluate) {
    await reevaluateMovie(movie.id);
    
    if (stats.movies.checked % 100 === 0) {
      process.stdout.write(`\r  معالج: ${stats.movies.checked} | فُك فلترته: ${stats.movies.unfiltered}`);
    }
  }
  console.log(`\n  ✅ انتهى معالجة الأفلام\n`);
}

// معالجة المسلسلات
async function processSeries() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📺 إعادة تقييم المسلسلات:\n');
  
  for (const series of seriesToReevaluate) {
    await reevaluateSeries(series.id);
    
    if (stats.series.checked % 100 === 0) {
      process.stdout.write(`\r  معالج: ${stats.series.checked} | فُك فلترته: ${stats.series.unfiltered}`);
    }
  }
  console.log(`\n  ✅ انتهى معالجة المسلسلات\n`);
}

// ============================================================
// STEP 4: التنفيذ
// ============================================================
async function main() {
  await processMovies();
  await processSeries();

  // النتائج النهائية
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 النتائج النهائية:\n');

  console.log('🎬 الأفلام:');
  console.log(`  تم فحصه: ${stats.movies.checked.toLocaleString()}`);
  console.log(`  ✅ فُك فلترته: ${stats.movies.unfiltered.toLocaleString()}`);
  console.log(`  🚫 لا يزال مفلتر: ${stats.movies.still_filtered.toLocaleString()}`);
  console.log(`  ❌ أخطاء: ${stats.movies.errors.toLocaleString()}\n`);

  console.log('📺 المسلسلات:');
  console.log(`  تم فحصه: ${stats.series.checked.toLocaleString()}`);
  console.log(`  ✅ فُك فلترته: ${stats.series.unfiltered.toLocaleString()}`);
  console.log(`  🚫 لا يزال مفلتر: ${stats.series.still_filtered.toLocaleString()}`);
  console.log(`  ❌ أخطاء: ${stats.series.errors.toLocaleString()}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ اكتمل إعادة التقييم!\n');

  db.close();
}

main().catch(console.error);
