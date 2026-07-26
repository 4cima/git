const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});
const localDb = new Database('./data/4cima-local.db');

async function main() {
  console.log('='.repeat(80));
  console.log('تحليل الأعمال بدون backdrop في Turso');
  console.log('='.repeat(80));

  console.log('\n📽️  جاري أخذ عينة من الأفلام (500 فيلم)...');
  const movies = await turso.execute('SELECT tmdb_id, title_ar, release_year FROM movies WHERE backdrop_path IS NULL OR backdrop_path = "" ORDER BY RANDOM() LIMIT 500');
  console.log('عدد الأفلام:', movies.rows.length);
  
  let mStats = { found: 0, hasBackdrop: 0, empty: 0, notFound: 0 };
  let mEx = { hasBackdrop: [], empty: [], notFound: [] };
  
  for (const m of movies.rows) {
    const local = localDb.prepare('SELECT backdrop_path FROM movies WHERE tmdb_id = ?').get(m.tmdb_id);
    if (local) {
      mStats.found++;
      if (local.backdrop_path && local.backdrop_path !== '') {
        mStats.hasBackdrop++;
        if (mEx.hasBackdrop.length < 10) mEx.hasBackdrop.push({ id: m.tmdb_id, title: m.title_ar, year: m.release_year, bd: local.backdrop_path });
      } else {
        mStats.empty++;
        if (mEx.empty.length < 10) mEx.empty.push({ id: m.tmdb_id, title: m.title_ar, year: m.release_year });
      }
    } else {
      mStats.notFound++;
      if (mEx.notFound.length < 10) mEx.notFound.push({ id: m.tmdb_id, title: m.title_ar, year: m.release_year });
    }
  }
  
  console.log('\n📊 نتائج الأفلام:');
  console.log('  موجود في Local:', mStats.found);
  console.log('    ✅ عنده backdrop:', mStats.hasBackdrop);
  console.log('    ⚠️  مالوش backdrop:', mStats.empty);
  console.log('  ❌ مش في Local:', mStats.notFound);
  
  console.log('\n🔍 أمثلة عندها backdrop في Local:');
  mEx.hasBackdrop.forEach(x => console.log(`  ${x.id} - ${x.title} (${x.year}) - ${x.bd}`));
  
  console.log('\n🔍 أمثلة مالهاش backdrop في Local:');
  mEx.empty.slice(0, 5).forEach(x => console.log(`  ${x.id} - ${x.title} (${x.year})`));
  
  console.log('\n🔍 أمثلة مش في Local:');
  mEx.notFound.slice(0, 5).forEach(x => console.log(`  ${x.id} - ${x.title} (${x.year})`));

  console.log('\n\n📺 جاري أخذ عينة من المسلسلات (500 مسلسل)...');
  const series = await turso.execute('SELECT tmdb_id, name_ar, first_air_year FROM tv_series WHERE backdrop_path IS NULL OR backdrop_path = "" ORDER BY RANDOM() LIMIT 500');
  console.log('عدد المسلسلات:', series.rows.length);
  
  let sStats = { found: 0, hasBackdrop: 0, empty: 0, notFound: 0 };
  let sEx = { hasBackdrop: [], empty: [], notFound: [] };
  
  for (const s of series.rows) {
    const local = localDb.prepare('SELECT backdrop_path FROM tv_series WHERE tmdb_id = ?').get(s.tmdb_id);
    if (local) {
      sStats.found++;
      if (local.backdrop_path && local.backdrop_path !== '') {
        sStats.hasBackdrop++;
        if (sEx.hasBackdrop.length < 10) sEx.hasBackdrop.push({ id: s.tmdb_id, name: s.name_ar, year: s.first_air_year, bd: local.backdrop_path });
      } else {
        sStats.empty++;
        if (sEx.empty.length < 10) sEx.empty.push({ id: s.tmdb_id, name: s.name_ar, year: s.first_air_year });
      }
    } else {
      sStats.notFound++;
      if (sEx.notFound.length < 10) sEx.notFound.push({ id: s.tmdb_id, name: s.name_ar, year: s.first_air_year });
    }
  }
  
  console.log('\n📊 نتائج المسلسلات:');
  console.log('  موجود في Local:', sStats.found);
  console.log('    ✅ عنده backdrop:', sStats.hasBackdrop);
  console.log('    ⚠️  مالوش backdrop:', sStats.empty);
  console.log('  ❌ مش في Local:', sStats.notFound);
  
  console.log('\n🔍 أمثلة عندها backdrop في Local:');
  sEx.hasBackdrop.forEach(x => console.log(`  ${x.id} - ${x.name} (${x.year}) - ${x.bd}`));
  
  console.log('\n🔍 أمثلة مالهاش backdrop في Local:');
  sEx.empty.slice(0, 5).forEach(x => console.log(`  ${x.id} - ${x.name} (${x.year})`));
  
  console.log('\n🔍 أمثلة مش في Local:');
  sEx.notFound.slice(0, 5).forEach(x => console.log(`  ${x.id} - ${x.name} (${x.year})`));

  console.log('\n' + '='.repeat(80));
  console.log('الخلاصة:');
  console.log('='.repeat(80));
  
  const mPct1 = (mStats.hasBackdrop / movies.rows.length * 100).toFixed(1);
  const mPct2 = (mStats.empty / movies.rows.length * 100).toFixed(1);
  const mPct3 = (mStats.notFound / movies.rows.length * 100).toFixed(1);
  
  console.log('\n📽️  الأفلام:');
  console.log(`  ${mPct1}% عندهم backdrop في Local (مشكلة UPDATE)`);
  console.log(`  ${mPct2}% مالهمش backdrop أصلاً`);
  console.log(`  ${mPct3}% مش في Local`);
  
  const sPct1 = (sStats.hasBackdrop / series.rows.length * 100).toFixed(1);
  const sPct2 = (sStats.empty / series.rows.length * 100).toFixed(1);
  const sPct3 = (sStats.notFound / series.rows.length * 100).toFixed(1);
  
  console.log('\n📺 المسلسلات:');
  console.log(`  ${sPct1}% عندهم backdrop في Local (مشكلة UPDATE)`);
  console.log(`  ${sPct2}% مالهمش backdrop أصلاً`);
  console.log(`  ${sPct3}% مش في Local`);
  
  console.log('\n' + '='.repeat(80));
  localDb.close();
}

main().catch(console.error);
