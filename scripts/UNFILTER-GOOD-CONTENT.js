require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');

console.log('\n🔓 إلغاء فلترة الأعمال الجيدة\n');
console.log('='.repeat(70));

const stats = {
  movies: { checked: 0, unfiltered: 0 },
  series: { checked: 0, unfiltered: 0 }
};

// ============================================
// 🎬 الأفلام
// ============================================
console.log('\n🎬 معالجة الأفلام...\n');

// الأفلام المفلترة بسبب no_poster أو no_overview
const filteredMovies = db.prepare(`
  SELECT id, vote_count, vote_average, primary_genre, filter_reason
  FROM movies
  WHERE is_filtered = 1
    AND (filter_reason = 'no_poster' OR filter_reason = 'no_overview')
`).all();

stats.movies.checked = filteredMovies.length;
console.log(`📊 وجدنا ${filteredMovies.length.toLocaleString()} فيلم مفلتر بسبب no_poster أو no_overview`);

const updateMovie = db.prepare(`
  UPDATE movies 
  SET is_filtered = 0, filter_reason = NULL
  WHERE id = ?
`);

filteredMovies.forEach(movie => {
  const voteCount = movie.vote_count || 0;
  const rating = movie.vote_average || 0;
  const primaryGenre = movie.primary_genre || '';
  const isDocumentary = primaryGenre.includes('Documentary') || primaryGenre.includes('وثائقي');
  
  // الشروط: vote_count > 50 AND vote_average > 6 AND ليس وثائقي
  if (voteCount > 50 && rating > 6 && !isDocumentary) {
    updateMovie.run(movie.id);
    stats.movies.unfiltered++;
    
    if (stats.movies.unfiltered % 100 === 0) {
      console.log(`✅ ${stats.movies.unfiltered} فيلم...`);
    }
  }
});

console.log(`\n✅ تم إلغاء فلترة ${stats.movies.unfiltered.toLocaleString()} فيلم`);

// ============================================
// 📺 المسلسلات
// ============================================
console.log('\n' + '='.repeat(70));
console.log('\n📺 معالجة المسلسلات...\n');

const filteredSeries = db.prepare(`
  SELECT id, vote_count, vote_average, primary_genre, filter_reason
  FROM tv_series
  WHERE is_filtered = 1
    AND (filter_reason = 'no_poster' OR filter_reason = 'no_overview')
`).all();

stats.series.checked = filteredSeries.length;
console.log(`📊 وجدنا ${filteredSeries.length.toLocaleString()} مسلسل مفلتر بسبب no_poster أو no_overview`);

const updateSeries = db.prepare(`
  UPDATE tv_series 
  SET is_filtered = 0, filter_reason = NULL
  WHERE id = ?
`);

filteredSeries.forEach(series => {
  const voteCount = series.vote_count || 0;
  const rating = series.vote_average || 0;
  const primaryGenre = series.primary_genre || '';
  const isDocumentary = primaryGenre.includes('Documentary') || primaryGenre.includes('وثائقي');
  
  // الشروط: vote_count > 50 AND vote_average > 6 AND ليس وثائقي
  if (voteCount > 50 && rating > 6 && !isDocumentary) {
    updateSeries.run(series.id);
    stats.series.unfiltered++;
    
    if (stats.series.unfiltered % 100 === 0) {
      console.log(`✅ ${stats.series.unfiltered} مسلسل...`);
    }
  }
});

console.log(`\n✅ تم إلغاء فلترة ${stats.series.unfiltered.toLocaleString()} مسلسل`);

// ============================================
// 📊 الملخص
// ============================================
console.log('\n' + '='.repeat(70));
console.log('\n📊 الملخص:\n');
console.log(`🎬 الأفلام:`);
console.log(`   - تم فحص: ${stats.movies.checked.toLocaleString()}`);
console.log(`   - تم إلغاء فلترتها: ${stats.movies.unfiltered.toLocaleString()}`);
console.log(`\n📺 المسلسلات:`);
console.log(`   - تم فحص: ${stats.series.checked.toLocaleString()}`);
console.log(`   - تم إلغاء فلترتها: ${stats.series.unfiltered.toLocaleString()}`);
console.log(`\n✅ إجمالي الأعمال التي تم إلغاء فلترتها: ${(stats.movies.unfiltered + stats.series.unfiltered).toLocaleString()}`);
console.log('\n' + '='.repeat(70) + '\n');
