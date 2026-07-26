#!/usr/bin/env node
/**
 * التحقق الحاسم: هل id = tmdb_id على كل الـ484 فيلم؟
 * إذا وُجد أي اختلاف، فالبيانات ملوثة ولازم تُمسح
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('🔍 فحص id=tmdb_id على Turso...\n');

  // 1. عدد الحالات المتطابقة vs غير المتطابقة
  const mismatchCount = await turso.execute({
    sql: 'SELECT COUNT(*) as mismatched FROM movies WHERE id != tmdb_id',
    args: []
  });
  
  const totalCount = await turso.execute({
    sql: 'SELECT COUNT(*) as total FROM movies',
    args: []
  });

  console.log(`📊 إجمالي الأفلام: ${totalCount.rows[0].total}`);
  console.log(`❌ عدد الحالات المختلفة (id ≠ tmdb_id): ${mismatchCount.rows[0].mismatched}\n`);

  // 2. أول 10 صفوف (لنرى البداية)
  const firstTen = await turso.execute({
    sql: 'SELECT id, tmdb_id, title_en FROM movies ORDER BY id ASC LIMIT 10',
    args: []
  });

  console.log('📌 أول 10 أفلام:');
  for (const row of firstTen.rows) {
    const match = row.id === row.tmdb_id ? '✅' : '❌';
    console.log(`  ${match} id:${row.id} / tmdb_id:${row.tmdb_id} — ${row.title_en}`);
  }

  // 3. آخر 10 صفوف (حيث يظهر الفساد عادةً)
  const lastTen = await turso.execute({
    sql: 'SELECT id, tmdb_id, title_en FROM movies ORDER BY id DESC LIMIT 10',
    args: []
  });

  console.log('\n📌 آخر 10 أفلام:');
  for (const row of lastTen.rows) {
    const match = row.id === row.tmdb_id ? '✅' : '❌';
    console.log(`  ${match} id:${row.id} / tmdb_id:${row.tmdb_id} — ${row.title_en}`);
  }

  // 4. أمثلة على الحالات المختلفة (إن وُجدت)
  if (mismatchCount.rows[0].mismatched > 0) {
    const examples = await turso.execute({
      sql: 'SELECT id, tmdb_id, title_en FROM movies WHERE id != tmdb_id LIMIT 5',
      args: []
    });

    console.log('\n❌ أمثلة على الحالات المختلفة:');
    for (const row of examples.rows) {
      console.log(`  id:${row.id} / tmdb_id:${row.tmdb_id} — ${row.title_en}`);
    }
  }

  // 5. فحص backdrop_path (هل موجود فعلاً؟)
  const backdropStats = await turso.execute({
    sql: 'SELECT COUNT(*) as with_backdrop FROM movies WHERE backdrop_path IS NOT NULL',
    args: []
  });

  console.log(`\n🖼️ عدد الأفلام بـ backdrop_path: ${backdropStats.rows[0].with_backdrop} / ${totalCount.rows[0].total}`);

  // 6. فحص schema Turso (الأعمدة الفعلية)
  const schema = await turso.execute({
    sql: 'PRAGMA table_info(movies)',
    args: []
  });

  console.log('\n📋 أعمدة جدول movies في Turso:');
  for (const col of schema.rows) {
    console.log(`  ${col.name} (${col.type})`);
  }
}

main().catch(err => {
  console.error('❌ خطأ:', err);
  process.exit(1);
});
