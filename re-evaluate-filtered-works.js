#!/usr/bin/env node

/**
 * 🔄 Re-evaluate Filtered Works
 * 
 * إعادة تقييم الأعمال المفلترة بـ "no_overview" التي أصبح لديها overview_ar الآن
 */

const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db');

console.log('🔄 إعادة تقييم الأعمال المفلترة\n');
console.log('═'.repeat(80));

const stats = {
  movies: { checked: 0, updated: 0, stillFiltered: 0 },
  series: { checked: 0, updated: 0, stillFiltered: 0 }
};

/**
 * فحص اكتمال فيلم
 */
function isMovieComplete(movie) {
  return (
    movie.title_en && movie.title_en.trim() !== '' &&
    movie.title_ar && movie.title_ar.trim() !== '' &&
    movie.overview_en && movie.overview_en.trim() !== '' &&
    movie.overview_ar && movie.overview_ar.trim() !== '' &&
    movie.poster_path && movie.poster_path.trim() !== '' &&
    movie.backdrop_path && movie.backdrop_path.trim() !== '' &&
    movie.release_date && movie.release_date.trim() !== ''
  );
}

/**
 * فحص اكتمال مسلسل
 */
function isSeriesComplete(series) {
  return (
    series.title_en && series.title_en.trim() !== '' &&
    series.title_ar && series.title_ar.trim() !== '' &&
    series.overview_en && series.overview_en.trim() !== '' &&
    series.overview_ar && series.overview_ar.trim() !== '' &&
    series.poster_path && series.poster_path.trim() !== '' &&
    series.backdrop_path && series.backdrop_path.trim() !== '' &&
    series.first_air_date && series.first_air_date.trim() !== ''
  );
}

try {
  // معالجة الأفلام
  console.log('\n🎬 معالجة الأفلام...\n');
  
  const movies = db.prepare(`
    SELECT * FROM movies 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_overview' 
    AND overview_ar IS NOT NULL
  `).all();
  
  stats.movies.checked = movies.length;
  console.log(`وجدت ${movies.length} فيلم للمراجعة`);
  
  for (const movie of movies) {
    if (isMovieComplete(movie)) {
      // العمل مكتمل الآن - إزالة الفلترة
      db.prepare(`
        UPDATE movies 
        SET is_filtered = 0, 
            filter_reason = NULL,
            is_complete = 1
        WHERE id = ?
      `).run(movie.id);
      
      stats.movies.updated++;
      console.log(`✅ [${stats.movies.updated}] ${movie.title_en} - أصبح مكتمل`);
    } else {
      // لا يزال غير مكتمل - تحديث سبب الفلترة
      let newReason = [];
      if (!movie.poster_path || movie.poster_path.trim() === '') newReason.push('no_poster');
      if (!movie.backdrop_path || movie.backdrop_path.trim() === '') newReason.push('no_backdrop');
      if (!movie.release_date || movie.release_date.trim() === '') newReason.push('no_release_date');
      if (!movie.title_ar || movie.title_ar.trim() === '') newReason.push('no_title_ar');
      
      if (newReason.length > 0) {
        db.prepare(`
          UPDATE movies 
          SET filter_reason = ?
          WHERE id = ?
        `).run(newReason[0], movie.id);
      }
      
      stats.movies.stillFiltered++;
    }
  }
  
  // معالجة المسلسلات
  console.log('\n📺 معالجة المسلسلات...\n');
  
  const series = db.prepare(`
    SELECT * FROM tv_series 
    WHERE is_filtered = 1 
    AND filter_reason = 'no_overview' 
    AND overview_ar IS NOT NULL
  `).all();
  
  stats.series.checked = series.length;
  console.log(`وجدت ${series.length} مسلسل للمراجعة`);
  
  for (const s of series) {
    if (isSeriesComplete(s)) {
      // العمل مكتمل الآن - إزالة الفلترة
      db.prepare(`
        UPDATE tv_series 
        SET is_filtered = 0, 
            filter_reason = NULL,
            is_complete = 1
        WHERE id = ?
      `).run(s.id);
      
      stats.series.updated++;
      console.log(`✅ [${stats.series.updated}] ${s.title_en} - أصبح مكتمل`);
    } else {
      // لا يزال غير مكتمل - تحديث سبب الفلترة
      let newReason = [];
      if (!s.poster_path || s.poster_path.trim() === '') newReason.push('no_poster');
      if (!s.backdrop_path || s.backdrop_path.trim() === '') newReason.push('no_backdrop');
      if (!s.first_air_date || s.first_air_date.trim() === '') newReason.push('no_first_air_date');
      if (!s.title_ar || s.title_ar.trim() === '') newReason.push('no_title_ar');
      
      if (newReason.length > 0) {
        db.prepare(`
          UPDATE tv_series 
          SET filter_reason = ?
          WHERE id = ?
        `).run(newReason[0], s.id);
      }
      
      stats.series.stillFiltered++;
    }
  }
  
  // النتائج النهائية
  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ اكتمل إعادة التقييم!\n');
  
  console.log('🎬 الأفلام:');
  console.log(`   تم فحص: ${stats.movies.checked}`);
  console.log(`   ✅ أصبح مكتمل: ${stats.movies.updated}`);
  console.log(`   ⚠️  لا يزال مفلتر: ${stats.movies.stillFiltered}`);
  
  console.log('\n📺 المسلسلات:');
  console.log(`   تم فحص: ${stats.series.checked}`);
  console.log(`   ✅ أصبح مكتمل: ${stats.series.updated}`);
  console.log(`   ⚠️  لا يزال مفلتر: ${stats.series.stillFiltered}`);
  
  console.log('\n' + '═'.repeat(80));
  
} catch (e) {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
} finally {
  db.close();
}
