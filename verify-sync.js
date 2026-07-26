require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');
const db = require('./scripts/services/local-db');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function verifyMovie(movieId) {
  // 1. القاعدة المحلية
  const local = db.prepare('SELECT * FROM movies WHERE id = ?').get(movieId);
  
  // 2. Turso
  const tursoResult = await turso.execute('SELECT * FROM movies WHERE id = ?', [movieId]);
  const remote = tursoResult.rows[0];
  
  console.log('='.repeat(80));
  console.log('🔍 مقارنة الفيلم ID:', movieId);
  console.log('='.repeat(80));
  
  const fields = [
    {name: 'Title EN', local: local.title_en, remote: remote.title_en},
    {name: 'Title AR', local: local.title_ar, remote: remote.title_ar},
    {name: 'Overview AR', local: local.overview_ar?.substring(0, 50), remote: remote.overview_ar?.substring(0, 50)},
    {name: 'Poster', local: local.poster_path, remote: remote.poster_path},
    {name: 'Backdrop', local: local.backdrop_path, remote: remote.backdrop_path},
    {name: 'Release Year', local: local.release_year, remote: remote.release_year},
    {name: 'Vote Average', local: local.vote_average, remote: remote.vote_average},
    {name: 'Vote Count', local: local.vote_count, remote: remote.vote_count},
    {name: 'Popularity', local: local.popularity, remote: remote.popularity},
    {name: 'Runtime', local: local.runtime, remote: remote.runtime},
    {name: 'Trailer Key', local: local.trailer_key, remote: remote.trailer_key},
    {name: 'SEO Title AR', local: local.seo_title_ar, remote: remote.seo_title_ar},
    {name: 'Canonical URL', local: local.canonical_url, remote: remote.canonical_url},
  ];
  
  let allMatch = true;
  fields.forEach(f => {
    const match = f.local === f.remote;
    const status = match ? '✅' : '❌';
    console.log(`${status} ${f.name}`);
    if (!match) {
      console.log(`   Local:  ${f.local}`);
      console.log(`   Remote: ${f.remote}`);
      allMatch = false;
    }
  });
  
  // فحص Genres و Cast
  const genres = remote.genres_json ? JSON.parse(remote.genres_json) : null;
  const cast = remote.cast_json ? JSON.parse(remote.cast_json) : null;
  
  console.log('\n📊 البيانات المُدمجة (JSON):');
  console.log(`${genres ? '✅' : '❌'} Genres: ${genres ? genres.length + ' genres' : 'NULL'}`);
  if (genres && genres.length > 0) {
    console.log('   - ' + genres.map(g => g.name_ar).join(', '));
  }
  
  console.log(`${cast ? '✅' : '❌'} Cast: ${cast ? cast.length + ' cast' : 'NULL'}`);
  if (cast && cast.length > 0) {
    console.log('   - ' + cast.slice(0, 3).map(c => `${c.name_ar} (${c.character_name})`).join(', '));
  }
  
  console.log('\n' + (allMatch ? '✅✅✅ البيانات متطابقة 100%!' : '⚠️ يوجد اختلافات!'));
  
  return allMatch;
}

async function verifySeries(seriesId) {
  // 1. القاعدة المحلية
  const local = db.prepare('SELECT * FROM tv_series WHERE id = ?').get(seriesId);
  
  if (!local) {
    console.log('❌ المسلسل غير موجود في القاعدة المحلية');
    return false;
  }
  
  // 2. Turso
  const tursoResult = await turso.execute('SELECT * FROM tv_series WHERE id = ?', [seriesId]);
  const remote = tursoResult.rows[0];
  
  if (!remote) {
    console.log('❌ المسلسل غير موجود في Turso');
    return false;
  }
  
  console.log('='.repeat(80));
  console.log('🔍 مقارنة المسلسل ID:', seriesId);
  console.log('='.repeat(80));
  
  const fields = [
    {name: 'Name EN', local: local.name_en, remote: remote.name_en},
    {name: 'Name AR', local: local.name_ar, remote: remote.name_ar},
    {name: 'Overview AR', local: local.overview_ar?.substring(0, 50), remote: remote.overview_ar?.substring(0, 50)},
    {name: 'Poster', local: local.poster_path, remote: remote.poster_path},
    {name: 'Backdrop', local: local.backdrop_path, remote: remote.backdrop_path},
    {name: 'First Air Year', local: local.first_air_year, remote: remote.first_air_year},
    {name: 'Vote Average', local: local.vote_average, remote: remote.vote_average},
    {name: 'Number of Seasons', local: local.number_of_seasons, remote: remote.number_of_seasons},
    {name: 'Number of Episodes', local: local.number_of_episodes, remote: remote.number_of_episodes},
  ];
  
  let allMatch = true;
  fields.forEach(f => {
    const match = f.local === f.remote;
    const status = match ? '✅' : '❌';
    console.log(`${status} ${f.name}`);
    if (!match) {
      console.log(`   Local:  ${f.local}`);
      console.log(`   Remote: ${f.remote}`);
      allMatch = false;
    }
  });
  
  // فحص Seasons و Episodes
  const seasons = remote.seasons_json ? JSON.parse(remote.seasons_json) : null;
  const episodes = remote.episodes_json ? JSON.parse(remote.episodes_json) : null;
  
  console.log('\n📊 المواسم والحلقات:');
  console.log(`${seasons ? '✅' : '❌'} Seasons: ${seasons ? seasons.length + ' seasons' : 'NULL'}`);
  console.log(`${episodes ? '✅' : '❌'} Episodes: ${episodes ? episodes.length + ' episodes' : 'NULL'}`);
  
  console.log('\n' + (allMatch ? '✅✅✅ البيانات متطابقة 100%!' : '⚠️ يوجد اختلافات!'));
  
  return allMatch;
}

async function main() {
  console.log('🔍 بدء التحقق الشامل من المزامنة\n');
  
  // فحص 3 أفلام
  const movies = db.prepare('SELECT id FROM movies WHERE synced_to_turso = 1 ORDER BY synced_at DESC LIMIT 3').all();
  
  console.log('📽️ فحص الأفلام:\n');
  for (const m of movies) {
    await verifyMovie(m.id);
    console.log('\n');
  }
  
  // فحص مسلسلات (إن وُجدت)
  const series = db.prepare('SELECT id FROM tv_series WHERE synced_to_turso = 1 ORDER BY synced_at DESC LIMIT 2').all();
  
  if (series.length > 0) {
    console.log('📺 فحص المسلسلات:\n');
    for (const s of series) {
      await verifySeries(s.id);
      console.log('\n');
    }
  } else {
    console.log('📺 لا توجد مسلسلات مُزامنة للفحص');
  }
  
  console.log('\n✅ اكتمل الفحص!');
}

main().catch(console.error);
