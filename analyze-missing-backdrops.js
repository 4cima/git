const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const localDb = new Database('./data/4cima-local.db');

async function analyzeMissingBackdrops() {
  console.log('='.repeat(80));
  console.log('تحليل الأعمال بدون backdrop في Turso');
  console.log('='.repeat(80));

  // ========== تحليل الأفلام ==========
  console.log('\n📽️  جاري أخذ عينة من الأفلام (500 فيلم)...');
  
  const tursoMoviesNoBackdrop = await turso.execute(
    'SELECT tmdb_id, title_ar, release_year FROM movies WHERE backdrop_path IS NULL OR backdrop_path = "" ORDER BY RANDOM() LIMIT 500'
  );
  
  console.log('عدد الأفلام في العينة:', tursoMoviesNoBackdrop.rows.length);
  
  let movieStats = {
    foundInLocal: 0,
    hasBackdropInLocal: 0,
    emptyBackdropInLocal: 0,
    notFoundInLocal: 0
  };
  
  const movieExamples = {
    hasBackdrop: [],
    emptyBackdrop: [],
    notFound: []
  };
  
  for (const movie of tursoMoviesNoBackdrop.rows) {
    const local = localDb.prepare('SELECT backdrop_path FROM movies WHERE tmdb_id = ?').get(movie.tmdb_id);
    
    if (local) {
      movieStats.foundInLocal++;
      if (local.backdrop_path && local.backdrop_path !== '') {
        movieStats.hasBackdropInLocal++;
        if (movieExamples.hasBackdrop.length < 10) {
          movieExamples.hasBackdrop.push({
            tmdb_id: movie.tmdb_id,
            title: movie.title_ar,
            year: movie.release_year,
            backdrop: local.backdrop_path
          });
        }
      } else {
        movieStats.emptyBackdropInLocal++;
        if (movieExamples.emptyBackdrop.length < 10) {
          movieExamples.emptyBackdrop.push({
            tmdb_id: movie.tmdb_id,
            title: movie.title_ar,
            year: movie.release_year
          });
        }
      }
    } else {
      movieStats.notFoundInLocal++;
      if (movieExamples.notFound.length < 10) {
        movieExamples.notFound.push({
          tmdb_id: movie.tmdb_id,
          title: movie.title_ar,
          year: movie.release_year
        });
      }
    }
  }
  
  console.log('\n📊 نتائج تحليل الأفلام:');
  console.log('  إجمالي العينة:', tursoMoviesNoBackdrop.rows.length);
  console.log('  موجود في Local:', movieStats.foundInLocal);
  console.log('    ✅ عنده backdrop في Local:', movieStats.hasBackdropInLocal);
  console.log('    ⚠️  مالوش backdrop في Local:', movieStats.emptyBackdropInLocal);
  console.log('  ❌ مش موجود في Local:', movieStats.notFoundInLocal);
  
  console.log('\n🔍 أمثلة من الأفلام اللي عندها backdrop في Local لكن مش في Turso:');
  movieExamples.hasBackdrop.forEach(m => {
    console.log(`  ${m.tmdb_id} - ${m.title} (${m.year}) - ${m.backdrop}`);
  });
  
  console.log('\n🔍 أمثلة من الأفلام اللي مالهاش backdrop في Local:');
  movieExamples.emptyBackdrop.slice(0, 5).forEach(m => {
    console.log(`  ${m.tmdb_id} - ${m.title} (${m.year})`);
  });
  
  console.log('\n🔍 أمثلة من الأفلام اللي مش موجودة في Local:');
  movieExamples.notFound.slice(0, 5).forEach(m => {
    console.log(`  ${m.tmdb_id} - ${m.title} (${m.year})`);
  });

  // ========== تحليل المسلسلات ==========
  console.log('\n\n📺 جاري أخذ عينة من المسلسلات (500 مسلسل)...');
  
  const tursoSeriesNoBackdrop = await turso.execute(
    'SELECT tmdb_id, name_ar, first_air_year FROM tv_series WHERE backdrop_path IS NULL OR backdrop_path = "" ORDER BY RANDOM() LIMIT 500'
  );
  
  console.log('عدد المسلسلات في العينة:', tursoSeriesNoBackdrop.rows.length);
  
  let seriesStats = {
    foundInLocal: 0,
    hasBackdropInLocal: 0,
    emptyBackdropInLocal: 0,
    notFoundInLocal: 0
  };
  
  const seriesExamples = {
    hasBackdrop: [],
    emptyBackdrop: [],
    notFound: []
  };
  
  for (const series of tursoSeriesNoBackdrop.rows) {
    const local = localDb.prepare('SELECT backdrop_path FROM tv_series WHERE tmdb_id = ?').get(series.tmdb_id);
    
    if (local) {
      seriesStats.foundInLocal++;
      if (local.backdrop_path && local.backdrop_path !== '') {
        seriesStats.hasBackdropInLocal++;
        if (seriesExamples.hasBackdrop.length < 10) {
          seriesExamples.hasBackdrop.push({
            tmdb_id: series.tmdb_id,
            name: series.name_ar,
            year: series.first_air_year,
            backdrop: local.backdrop_path
          });
        }
      } else {
        seriesStats.emptyBackdropInLocal++;
        if (seriesExamples.emptyBackdrop.length < 10) {
          seriesExamples.emptyBackdrop.push({
            tmdb_id: series.tmdb_id,
            name: series.name_ar,
            year: series.first_air_year
          });
        }
      }
    } else {
      seriesStats.notFoundInLocal++;
      if (seriesExamples.notFound.length < 10) {
        seriesExamples.notFound.push({
          tmdb_id: series.tmdb_id,
          name: series.name_ar,
          year: series.first_air_year
        });
      }
    }
  }
  
  console.log('\n📊 نتائج تحليل المسلسلات:');
  console.log('  إجمالي العينة:', tursoSeriesNoBackdrop.rows.length);
  console.log('  موجود في Local:', seriesStats.foundInLocal);
  console.log('    ✅ عنده backdrop في Local:', seriesStats.hasBackdropInLocal);
  console.log('    ⚠️  مالوش backdrop في Local:', seriesStats.emptyBackdropInLocal);
  console.log('  ❌ مش موجود في Local:', seriesStats.notFoundInLocal);
  
  console.log('\n🔍 أمثلة من المسلسلات اللي عندها backdrop في Local لكن مش في Turso:');
  seriesExamples.hasBackdrop.forEach(s => {
    console.log(`  ${s.tmdb_id} - ${s.name} (${s.year}) - ${s.backdrop}`);
  });
  
  console.log('\n🔍 أمثلة من المسلسلات اللي مالهاش backdrop في Local:');
  seriesExamples.emptyBackdrop.slice(0, 5).forEach(s => {
    console.log(`  ${s.tmdb_id} - ${s.name} (${s.year})`);
  });
  
  console.log('\n🔍 أمثلة من المسلسلات اللي مش موجودة في Local:');
  seriesExamples.notFound.slice(0, 5).forEach(s => {
    console.log(`  ${s.tmdb_id} - ${s.name} (${s.year})`);
  });

  // ========== الخلاصة ==========
  console.log('\n' + '='.repeat(80));
  console.log('الخلاصة النهائية:');
  console.log('='.repeat(80));
  
  const moviePctHasBackdrop = (movieStats.hasBackdropInLocal / tursoMoviesNoBackdrop.rows.length * 100).toFixed(1);
  const moviePctEmpty = (movieStats.emptyBackdropInLocal / tursoMoviesNoBackdrop.rows.length * 100).toFixed(1);
  const moviePctNotFound = (movieStats.notFoundInLocal / tursoMoviesNoBackdrop.rows.length * 100).toFixed(1);
  
  console.log('\n📽️  الأفلام:');
  console.log(`  ${moviePctHasBackdrop}% عندهم backdrop في Local لكن ما اتحدثوش في Turso (مشكلة في UPDATE)`);
  console.log(`  ${moviePctEmpty}% مالهمش backdrop في Local أصلاً (TMDB مافيش backdrop)`);
  console.log(`  ${moviePctNotFound}% مش موجودين في Local (اتحذفوا أو ما اتزامنوش)`);
  
  const seriesPctHasBackdrop = (seriesStats.hasBackdropInLocal / tursoSeriesNoBackdrop.rows.length * 100).toFixed(1);
  const seriesPctEmpty = (seriesStats.emptyBackdropInLocal / tursoSeriesNoBackdrop.rows.length * 100).toFixed(1);
  const seriesPctNotFound = (seriesStats.notFoundInLocal / tursoSeriesNoBackdrop.rows.length * 100).toFixed(1);
  
  console.log('\n📺 المسلسلات:');
  console.log(`  ${seriesPctHasBackdrop}% عندهم backdrop في Local لكن ما اتحدثوش في Turso (مشكلة في UPDATE)`);
  console.log(`  ${seriesPctEmpty}% مالهمش backdrop في Local أصلاً (TMDB مافيش backdrop)`);
  console.log(`  ${seriesPctNotFound}% مش موجودين في Local (اتحذفوا أو ما اتزامنوش)`);
  
  console.log('\n' + '='.repeat(80));
  
  localDb.close();
}

analyzeMissingBackdrops().catch(console.error);
