require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = require('./scripts/services/local-db');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// عينة من الـ tmdb_ids الفاشلة
const FAILED_IDS = [1627985, 1647934, 1645683, 676527, 838301, 1167802, 1564476, 1642133];

console.log('🔍 تشخيص فشل المزامنة\n');
console.log('═'.repeat(70));

async function main() {
  console.log('\n1️⃣ فحص القاعدة المحلية:\n');
  
  for (const tmdb_id of FAILED_IDS.slice(0, 3)) {
    const local = db.prepare(`
      SELECT id, tmdb_id, title_en, is_complete 
      FROM movies 
      WHERE tmdb_id = ?
    `).all(tmdb_id);
    
    console.log(`tmdb_id=${tmdb_id}:`);
    if (local.length === 0) {
      console.log('  ⚠️ غير موجود محلياً\n');
    } else if (local.length === 1) {
      console.log(`  ✅ موجود: id=${local[0].id}, title="${local[0].title_en}"`);
      console.log(`  complete=${local[0].is_complete}\n`);
    } else {
      console.log(`  ⚠️ مكرر ${local.length} مرة محلياً!`);
      local.forEach((m, i) => {
        console.log(`     [${i+1}] id=${m.id}, title="${m.title_en}"`);
      });
      console.log('');
    }
  }
  
  console.log('═'.repeat(70));
  console.log('\n2️⃣ فحص Turso:\n');
  
  for (const tmdb_id of FAILED_IDS.slice(0, 3)) {
    const result = await turso.execute({
      sql: 'SELECT id, tmdb_id, title_en FROM movies WHERE tmdb_id = ?',
      args: [tmdb_id]
    });
    
    console.log(`tmdb_id=${tmdb_id}:`);
    if (result.rows.length === 0) {
      console.log('  ✅ غير موجود في Turso (جديد)\n');
    } else if (result.rows.length === 1) {
      const row = result.rows[0];
      console.log(`  ⚠️ موجود مسبقاً: id=${row.id}, title="${row.title_en}"`);
      if (row.id === row.tmdb_id) {
        console.log('  ✅ id = tmdb_id (نظيف)\n');
      } else {
        console.log(`  ❌ id != tmdb_id (قديم: id=${row.id})\n`);
      }
    } else {
      console.log(`  ❌ مكرر ${result.rows.length} مرة في Turso!`);
      result.rows.forEach((row, i) => {
        console.log(`     [${i+1}] id=${row.id}, tmdb_id=${row.tmdb_id}, title="${row.title_en}"`);
      });
      console.log('');
    }
  }
  
  console.log('═'.repeat(70));
  console.log('\n3️⃣ فحص عام:\n');
  
  // كم فيلم محلياً مكرر
  const localDupes = db.prepare(`
    SELECT COUNT(*) as c 
    FROM (
      SELECT tmdb_id 
      FROM movies 
      WHERE is_complete = 1 
      GROUP BY tmdb_id 
      HAVING COUNT(*) > 1
    )
  `).get();
  
  console.log(`الأفلام المكتملة محلياً بـ tmdb_id مكرر: ${localDupes.c}`);
  
  // كم فيلم في Turso مكرر
  const tursoDupes = await turso.execute(`
    SELECT COUNT(*) as c 
    FROM (
      SELECT tmdb_id 
      FROM movies 
      GROUP BY tmdb_id 
      HAVING COUNT(*) > 1
    )
  `);
  
  console.log(`الأفلام في Turso بـ tmdb_id مكرر: ${tursoDupes.rows[0].c}`);
  
  console.log('\n═'.repeat(70));
  
  process.exit(0);
}

main().catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
