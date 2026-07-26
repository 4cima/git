require('dotenv').config({ path: '.env.local' });
const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const localDb = new Database('data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function verify() {
  console.log('🔍 التحقق من التطابق بين Turso والمحلي\n');
  console.log('═'.repeat(70));
  
  // 1. جلب عينة من tmdb_ids من Turso
  console.log('\n1️⃣ جلب عينة 1000 tmdb_id من Turso...\n');
  const tursoSample = await turso.execute(`
    SELECT tmdb_id FROM movies ORDER BY tmdb_id ASC LIMIT 1000
  `);
  
  const tursoIds = tursoSample.rows.map(r => r.tmdb_id);
  console.log(`   تم جلب ${tursoIds.length} tmdb_id من Turso`);
  console.log(`   النطاق: ${tursoIds[0]} إلى ${tursoIds[tursoIds.length - 1]}`);
  
  // 2. فحص وجودهم في المحلي
  console.log('\n2️⃣ فحص وجودهم في المحلي...\n');
  
  const placeholders = tursoIds.map(() => '?').join(',');
  const found = localDb.prepare(`
    SELECT COUNT(*) as c FROM movies WHERE tmdb_id IN (${placeholders})
  `).get(...tursoIds);
  
  console.log(`   موجود في المحلي: ${found.c}/${tursoIds.length}`);
  
  if (found.c === tursoIds.length) {
    console.log('   ✅ كل الـtmdb_ids من Turso موجودة في المحلي');
  } else {
    console.log(`   ⚠️  ناقص: ${tursoIds.length - found.c} tmdb_id غير موجود في المحلي`);
    
    // إيجاد المفقودين
    const foundIds = new Set(
      localDb.prepare(`SELECT tmdb_id FROM movies WHERE tmdb_id IN (${placeholders})`)
        .all(...tursoIds)
        .map(r => r.tmdb_id)
    );
    
    const missing = tursoIds.filter(id => !foundIds.has(id));
    console.log(`\n   المفقودين (أول 10):`);
    missing.slice(0, 10).forEach(id => console.log(`     tmdb_id=${id}`));
  }
  
  // 3. فحص عكسي: عينة من المحلي موجودة في Turso؟
  console.log('\n3️⃣ فحص عكسي: عينة من المحلي...\n');
  
  const localSample = localDb.prepare(`
    SELECT tmdb_id FROM movies ORDER BY tmdb_id ASC LIMIT 1000
  `).all();
  
  console.log(`   عينة من المحلي: ${localSample.length} tmdb_id`);
  console.log(`   النطاق: ${localSample[0].tmdb_id} إلى ${localSample[localSample.length - 1].tmdb_id}`);
  
  // فحص كام منهم في Turso
  let foundInTurso = 0;
  for (const row of localSample.slice(0, 100)) { // عينة 100 بس للسرعة
    const exists = await turso.execute({
      sql: 'SELECT 1 FROM movies WHERE tmdb_id = ? LIMIT 1',
      args: [row.tmdb_id]
    });
    if (exists.rows.length > 0) foundInTurso++;
  }
  
  console.log(`   موجود في Turso: ${foundInTurso}/100 (من أول 100)`);
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 الخلاصة:\n');
  console.log(`   Turso → المحلي: ${found.c}/${tursoIds.length} (${(found.c/tursoIds.length*100).toFixed(1)}%)`);
  console.log(`   المحلي → Turso: ${foundInTurso}/100 (${foundInTurso}%)`);
  
  if (found.c === tursoIds.length && foundInTurso < 50) {
    console.log('\n   ✅ الاستنتاج: Turso هي subset من المحلي');
    console.log('   📝 التوصية: شيل شرط WHERE id = tmdb_id من قراءة المحلي');
    console.log('              واقرأ بناءً على الـtmdb_ids الموجودة في Turso فقط');
  }
  
  console.log('\n' + '═'.repeat(70));
  
  localDb.close();
  process.exit(0);
}

verify().catch(e => {
  console.error('❌ خطأ:', e.message);
  localDb.close();
  process.exit(1);
});
