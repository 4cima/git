const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const d = new Database('./data/4cima-local.db');

async function main() {
  // أفلام بدون backdrop في Turso
  const moviesNoBd = await turso.execute(
    'SELECT tmdb_id, title_ar, release_year FROM movies WHERE backdrop_path IS NULL LIMIT 500'
  );
  
  console.log('عينة أفلام بدون backdrop في Turso:', moviesNoBd.rows.length);
  
  let hasInLocal = 0;
  let emptyInLocal = 0;
  let notInLocal = 0;
  const examples = { hasInLocal: [], emptyInLocal: [], notInLocal: [] };
  
  for (const movie of moviesNoBd.rows) {
    const local = d.prepare('SELECT backdrop_path FROM movies WHERE tmdb_id = ?').get(movie.tmdb_id);
    if (!local) {
      notInLocal++;
      if (examples.notInLocal.length < 5) examples.notInLocal.push(movie);
    } else if (local.backdrop_path && local.backdrop_path.length > 0) {
      hasInLocal++;
      if (examples.hasInLocal.length < 5) examples.hasInLocal.push({ ...movie, bd: local.backdrop_path });
    } else {
      emptyInLocal++;
      if (examples.emptyInLocal.length < 5) examples.emptyInLocal.push(movie);
    }
  }
  
  console.log('\n=== نتائج الأفلام ===');
  console.log('عنده backdrop في Local (فشل UPDATE):', hasInLocal);
  console.log('مالوش backdrop في Local (TMDB مالوش):', emptyInLocal);
  console.log('مش موجود في Local أصلاً:', notInLocal);
  console.log('\nأمثلة عندها backdrop في Local بس مش في Turso:');
  examples.hasInLocal.forEach(x => console.log(' ', x.tmdb_id, '-', x.title_ar, '-', x.bd));
  console.log('\nأمثلة مالهاش backdrop خالص:');
  examples.emptyInLocal.forEach(x => console.log(' ', x.tmdb_id, '-', x.title_ar, '(', x.release_year, ')'));
  console.log('\nأمثلة مش في Local:');
  examples.notInLocal.forEach(x => console.log(' ', x.tmdb_id, '-', x.title_ar, '(', x.release_year, ')'));
  
  // نفس الشيء للمسلسلات
  const seriesNoBd = await turso.execute(
    'SELECT tmdb_id, name_ar, first_air_year FROM tv_series WHERE backdrop_path IS NULL LIMIT 500'
  );
  
  console.log('\n\nعينة مسلسلات بدون backdrop في Turso:', seriesNoBd.rows.length);
  
  let sHasInLocal = 0;
  let sEmptyInLocal = 0;
  let sNotInLocal = 0;
  
  for (const series of seriesNoBd.rows) {
    const local = d.prepare('SELECT backdrop_path FROM tv_series WHERE tmdb_id = ?').get(series.tmdb_id);
    if (!local) {
      sNotInLocal++;
    } else if (local.backdrop_path && local.backdrop_path.length > 0) {
      sHasInLocal++;
    } else {
      sEmptyInLocal++;
    }
  }
  
  console.log('=== نتائج المسلسلات ===');
  console.log('عنده backdrop في Local (فشل UPDATE):', sHasInLocal);
  console.log('مالوش backdrop في Local:', sEmptyInLocal);
  console.log('مش موجود في Local أصلاً:', sNotInLocal);
  
  d.close();
}

main().catch(console.error);
