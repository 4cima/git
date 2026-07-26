#!/usr/bin/env node
const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const localDb = new Database(path.join(__dirname, '..', 'data', '4cima-local.db'));
const BATCH_SIZE = 200;

async function updateTable(tableName, items, label) {
  console.log(`\n${label}: ${items.length.toLocaleString()} سجل`);
  let done = 0;
  const start = Date.now();
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const stmts = batch.map(item => ({
      sql: `UPDATE ${tableName} SET backdrop_path = ? WHERE tmdb_id = ?`,
      args: [item.backdrop_path, item.tmdb_id]
    }));
    
    try {
      await turso.batch(stmts, 'write');
      done += batch.length;
      const pct = (done / items.length * 100).toFixed(1);
      const rate = (done / ((Date.now() - start) / 1000)).toFixed(0);
      const eta = ((items.length - done) / rate / 60).toFixed(1);
      process.stdout.write(`\r  ${pct}% | ${done.toLocaleString()}/${items.length.toLocaleString()} | ${rate}/ث | المتبقي: ${eta} دقيقة   `);
    } catch (e) {
      console.error('\n❌ خطأ في الدفعة:', e.message);
    }
  }
  console.log(`\n✅ ${label} اكتمل!`);
}

async function main() {
  console.log('=== تحديث backdrop_path في Turso ===\n');
  
  const movies = localDb.prepare(
    'SELECT tmdb_id, backdrop_path FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ""'
  ).all();
  
  const series = localDb.prepare(
    'SELECT tmdb_id, backdrop_path FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ""'
  ).all();
  
  console.log('📊 إحصائيات القاعدة المحلية:');
  console.log(`  🎬 أفلام: ${movies.length.toLocaleString()}`);
  console.log(`  📺 مسلسلات: ${series.length.toLocaleString()}`);
  
  if (movies.length > 0) {
    await updateTable('movies', movies, '🎬 تحديث الأفلام');
  }
  
  if (series.length > 0) {
    await updateTable('tv_series', series, '📺 تحديث المسلسلات');
  }
  
  const checkM = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE backdrop_path IS NOT NULL');
  const checkS = await turso.execute('SELECT COUNT(*) as c FROM tv_series WHERE backdrop_path IS NOT NULL');
  
  console.log('\n📊 النتيجة النهائية في Turso:');
  console.log(`  🎬 أفلام بها backdrop: ${checkM.rows[0].c.toLocaleString()}`);
  console.log(`  📺 مسلسلات بها backdrop: ${checkS.rows[0].c.toLocaleString()}`);
  
  localDb.close();
  console.log('\n✅ اكتمل التحديث بنجاح!');
}

main().catch(e => {
  console.error('\n❌ خطأ:', e.message);
  localDb.close();
  process.exit(1);
});
