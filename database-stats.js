const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const localDb = new Database('./data/4cima-local.db');
const turso = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('\n' + '═'.repeat(100));
  console.log('                    📊 احصائية شاملة لقاعدة البيانات 📊');
  console.log('═'.repeat(100) + '\n');

  // Local DB
  console.log('🗄️  قاعدة البيانات المحلية (SQLite):\n');
  
  const localTables = localDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();

  for (const table of localTables) {
    const name = table.name;
    const count = localDb.prepare(`SELECT COUNT(*) as cnt FROM ${name}`).get().cnt;
    console.log(`   📋 ${name.padEnd(20)} - ${count.toString().padStart(10)} صف`);
    
    const cols = localDb.prepare(`PRAGMA table_info(${name})`).all();
    cols.slice(0, 5).forEach(c => {
      console.log(`      └─ ${c.name.padEnd(25)} (${c.type})`);
    });
    if (cols.length > 5) console.log(`      └─ ... و${cols.length - 5} أعمدة أخرى\n`);
    else console.log();
  }

  // Turso DB
  console.log('\n🚀 قاعدة بيانات Turso:\n');
  
  try {
    const tursoTables = await turso.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);

    for (const table of tursoTables.rows) {
      const name = table.name;
      const countRes = await turso.execute(`SELECT COUNT(*) as cnt FROM ${name}`);
      const count = countRes.rows[0].cnt;
      console.log(`   📋 ${name.padEnd(20)} - ${count.toString().padStart(10)} صف`);
      
      const colsRes = await turso.execute(`PRAGMA table_info(${name})`);
      const cols = colsRes.rows;
      cols.slice(0, 5).forEach(c => {
        console.log(`      └─ ${c.name.padEnd(25)} (${c.type})`);
      });
      if (cols.length > 5) console.log(`      └─ ... و${cols.length - 5} أعمدة أخرى\n`);
      else console.log();
    }
  } catch (e) {
    console.log('❌ خطأ في Turso:', e.message);
  }

  // backdrop_path Analysis
  console.log('\n🔍 تحليل backdrop_path:\n');

  try {
    const moviesLocal = localDb.prepare(`SELECT COUNT(*) as cnt FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`).get().cnt;
    const moviesTotal = localDb.prepare(`SELECT COUNT(*) as cnt FROM movies`).get().cnt;
    console.log(`   📽️  الأفلام (Local): ${moviesLocal}/${moviesTotal} (${(moviesLocal/moviesTotal*100).toFixed(1)}%)`);

    const seriesLocal = localDb.prepare(`SELECT COUNT(*) as cnt FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`).get().cnt;
    const seriesTotal = localDb.prepare(`SELECT COUNT(*) as cnt FROM tv_series`).get().cnt;
    console.log(`   📺 المسلسلات (Local): ${seriesLocal}/${seriesTotal} (${(seriesLocal/seriesTotal*100).toFixed(1)}%)\n`);

    const moviesTurso = await turso.execute(`SELECT COUNT(*) as cnt FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`);
    const moviesTursoTotal = await turso.execute(`SELECT COUNT(*) as cnt FROM movies`);
    console.log(`   📽️  الأفلام (Turso): ${moviesTurso.rows[0].cnt}/${moviesTursoTotal.rows[0].cnt}`);

    const seriesTurso = await turso.execute(`SELECT COUNT(*) as cnt FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`);
    const seriesTursoTotal = await turso.execute(`SELECT COUNT(*) as cnt FROM tv_series`);
    console.log(`   📺 المسلسلات (Turso): ${seriesTurso.rows[0].cnt}/${seriesTursoTotal.rows[0].cnt}\n`);
  } catch (e) {
    console.log('❌ خطأ:', e.message);
  }

  console.log('═'.repeat(100) + '\n');
  localDb.close();
}

main().catch(console.error);
