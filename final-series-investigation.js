require('dotenv').config({path:'.env.local'});
const Database = require('better-sqlite3');
const {createClient} = require('@libsql/client');

const localDb = new Database('data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function investigate() {
  console.log('\n🔍 فحص نهائي شامل للمسلسلات\n');
  console.log('═'.repeat(70));
  
  // 1. هل الـ slugs فيها IDs من ضمن الـ 44,620؟
  console.log('\n1️⃣ الـ slugs فيها double-dash من الـ 44,620 المستهدفة:\n');
  
  const localWithIds = localDb.prepare(`
    SELECT COUNT(*) as cnt
    FROM tv_series
    WHERE slug LIKE '%--%'
    AND name_en NOT LIKE 'Item %'
  `).get();
  
  console.log(`   في القاعدة المحلية: ${localWithIds.cnt.toLocaleString()}`);
  
  const tursoWithIds = await turso.execute(`
    SELECT COUNT(*) as cnt
    FROM tv_series
    WHERE slug LIKE '%--%'
  `);
  
  console.log(`   في Turso: ${tursoWithIds.rows[0].cnt.toLocaleString()}\n`);
  
  if (localWithIds.cnt > 0) {
    console.log('   عينة من المسلسلات المستهدفة اللي لسه فيها double-dash:\n');
    const samples = localDb.prepare(`
      SELECT id, tmdb_id, name_en, slug
      FROM tv_series
      WHERE slug LIKE '%--%'
      AND name_en NOT LIKE 'Item %'
      LIMIT 10
    `).all();
    
    samples.forEach(s => {
      console.log(`     id=${s.id}, tmdb=${s.tmdb_id}`);
      console.log(`       name: "${s.name_en}"`);
      console.log(`       slug: ${s.slug}\n`);
    });
  }
  
  // 2. tmdb_id السالبة
  console.log('2️⃣ tmdb_id السالبة:\n');
  
  const negativeLocal = localDb.prepare(`
    SELECT COUNT(*) as cnt, MIN(tmdb_id) as min_id, MAX(tmdb_id) as max_id
    FROM tv_series
    WHERE tmdb_id < 0
  `).get();
  
  console.log(`   في القاعدة المحلية: ${negativeLocal.cnt.toLocaleString()}`);
  console.log(`   نطاق: ${negativeLocal.min_id} إلى ${negativeLocal.max_id}\n`);
  
  if (negativeLocal.cnt > 0) {
    console.log('   عينة من tmdb_id السالبة:\n');
    const samples = localDb.prepare(`
      SELECT id, tmdb_id, name_en, slug, source, created_at
      FROM tv_series
      WHERE tmdb_id < 0
      ORDER BY tmdb_id ASC
      LIMIT 10
    `).all();
    
    samples.forEach(s => {
      console.log(`     tmdb=${s.tmdb_id}, id=${s.id}`);
      console.log(`       name: "${s.name_en}"`);
      console.log(`       slug: ${s.slug}`);
      console.log(`       source: ${s.source}, created: ${s.created_at}\n`);
    });
  }
  
  // 3. الـ 27 فشل
  console.log('3️⃣ تفاصيل الـ 27 فشل:\n');
  console.log('   (هذه معلومة من السكريبت السابق - لم يتم تسجيل التفاصيل)');
  console.log('   لتسجيل الأخطاء، يجب تشغيل السكريبت مرة أخرى مع logging محسّن.\n');
  
  // 4. المجموعة الثالثة (إن وجدت)
  console.log('4️⃣ تحليل المجموعات:\n');
  
  const groups = localDb.prepare(`
    SELECT 
      CASE
        WHEN name_en LIKE 'Item %' THEN 'placeholder'
        WHEN tmdb_id < 0 THEN 'negative_id'
        ELSE 'normal'
      END as group_type,
      COUNT(*) as cnt
    FROM tv_series
    GROUP BY group_type
  `).all();
  
  groups.forEach(g => {
    console.log(`   ${g.group_type}: ${g.cnt.toLocaleString()}`);
  });
  
  // تفاصيل المجموعة السالبة
  if (negativeLocal.cnt > 0) {
    console.log('\n   تفاصيل المجموعة السالبة:\n');
    
    const negDetails = localDb.prepare(`
      SELECT 
        is_complete,
        synced_to_turso,
        COUNT(*) as cnt
      FROM tv_series
      WHERE tmdb_id < 0
      GROUP BY is_complete, synced_to_turso
    `).all();
    
    negDetails.forEach(d => {
      console.log(`     is_complete=${d.is_complete}, synced=${d.synced_to_turso}: ${d.cnt.toLocaleString()}`);
    });
  }
  
  console.log('\n═'.repeat(70));
  
  localDb.close();
  process.exit(0);
}

investigate().catch(e => {
  console.error('❌ خطأ:', e.message);
  localDb.close();
  process.exit(1);
});
