require('dotenv').config({path:'.env.local'});
const Database = require('better-sqlite3');
const {createClient} = require('@libsql/client');

const localDb = new Database('data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function checkStatus() {
  console.log('\n🔍 فحص حالة id != tmdb_id\n');
  console.log('═'.repeat(70));
  
  // 1. القاعدة المحلية - الأفلام
  console.log('\n1️⃣ القاعدة المحلية - الأفلام:\n');
  const localMovies = localDb.prepare(`
    SELECT COUNT(*) as cnt FROM movies WHERE id != tmdb_id
  `).get();
  console.log(`   id != tmdb_id: ${localMovies.cnt.toLocaleString()}`);
  
  // 2. القاعدة المحلية - المسلسلات
  console.log('\n2️⃣ القاعدة المحلية - المسلسلات:\n');
  const localSeries = localDb.prepare(`
    SELECT COUNT(*) as cnt FROM tv_series WHERE id != tmdb_id
  `).get();
  console.log(`   id != tmdb_id: ${localSeries.cnt.toLocaleString()}`);
  
  // 3. Turso - الأفلام
  console.log('\n3️⃣ Turso - الأفلام:\n');
  const tursoMovies = await turso.execute(`
    SELECT COUNT(*) as cnt FROM movies WHERE id != tmdb_id
  `);
  console.log(`   id != tmdb_id: ${tursoMovies.rows[0].cnt.toLocaleString()}`);
  
  // 4. Turso - المسلسلات
  console.log('\n4️⃣ Turso - المسلسلات:\n');
  const tursoSeries = await turso.execute(`
    SELECT COUNT(*) as cnt FROM tv_series WHERE id != tmdb_id
  `);
  console.log(`   id != tmdb_id: ${tursoSeries.rows[0].cnt.toLocaleString()}`);
  
  // 5. عينة من المشاكل الجديدة (آخر 10)
  console.log('\n5️⃣ عينة من الأفلام الجديدة بمشكلة (آخر 10):\n');
  const newProblems = localDb.prepare(`
    SELECT id, tmdb_id, title_en, created_at
    FROM movies
    WHERE id != tmdb_id
    ORDER BY created_at DESC
    LIMIT 10
  `).all();
  
  newProblems.forEach(m => {
    console.log(`   id=${m.id}, tmdb_id=${m.tmdb_id}`);
    console.log(`     title: "${m.title_en}"`);
    console.log(`     created: ${m.created_at}\n`);
  });
  
  console.log('═'.repeat(70));
  
  // التحليل
  console.log('\n📊 التحليل:\n');
  
  if (localMovies.cnt > 0) {
    console.log(`   ⚠️  ${localMovies.cnt.toLocaleString()} فيلم في المحلي بمشكلة`);
    console.log(`   السبب المحتمل: merge-new-tmdb-ids.js أضاف صفوف بـ auto-increment`);
  } else {
    console.log(`   ✅ صفر أفلام بمشكلة في المحلي`);
  }
  
  if (localSeries.cnt > 0) {
    console.log(`   ⚠️  ${localSeries.cnt.toLocaleString()} مسلسل في المحلي بمشكلة`);
  } else {
    console.log(`   ✅ صفر مسلسلات بمشكلة في المحلي`);
  }
  
  console.log('\n');
  
  localDb.close();
  process.exit(0);
}

checkStatus().catch(e => {
  console.error('❌ خطأ:', e.message);
  localDb.close();
  process.exit(1);
});
