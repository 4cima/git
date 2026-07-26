require('dotenv').config({path:'.env.local'});
const Database = require('better-sqlite3');
const {createClient} = require('@libsql/client');
const fs = require('fs');

const localDb = new Database('data/4cima-local.db');
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function backupAndDelete() {
  console.log('\n🗑️  حذف المسلسلات بـ tmdb_id سالب\n');
  console.log('═'.repeat(70));
  
  // 1. Backup من المحلي
  console.log('\n1️⃣ Backup:\n');
  const toBackup = localDb.prepare('SELECT * FROM tv_series WHERE tmdb_id < 0').all();
  console.log(`   المسلسلات للحذف: ${toBackup.length}`);
  
  fs.writeFileSync(
    'DELETED-negative-tmdb-series-backup.json',
    JSON.stringify(toBackup, null, 2)
  );
  console.log(`   ✅ تم الحفظ في: DELETED-negative-tmdb-series-backup.json\n`);
  
  // 2. الحذف من المحلي
  console.log('2️⃣ الحذف من القاعدة المحلية:\n');
  const localResult = localDb.prepare('DELETE FROM tv_series WHERE tmdb_id < 0').run();
  console.log(`   ✅ تم حذف: ${localResult.changes} صف\n`);
  
  // 3. الحذف من Turso
  console.log('3️⃣ الحذف من Turso:\n');
  try {
    const tursoResult = await turso.execute('DELETE FROM tv_series WHERE tmdb_id < 0');
    console.log(`   ✅ تم حذف من Turso\n`);
  } catch (e) {
    console.log(`   ⚠️  خطأ في Turso: ${e.message}\n`);
  }
  
  // 4. التأكيد النهائي
  console.log('4️⃣ التأكيد:\n');
  
  const localNegative = localDb.prepare('SELECT COUNT(*) as cnt FROM tv_series WHERE tmdb_id < 0').get();
  const localTotal = localDb.prepare('SELECT COUNT(*) as cnt FROM tv_series').get();
  
  console.log('   القاعدة المحلية:');
  console.log(`     tmdb_id < 0: ${localNegative.cnt} (المتوقع: 0)`);
  console.log(`     الإجمالي: ${localTotal.cnt.toLocaleString()} (المتوقع: 224,070)\n`);
  
  const tursoNegative = await turso.execute('SELECT COUNT(*) as cnt FROM tv_series WHERE tmdb_id < 0');
  const tursoTotal = await turso.execute('SELECT COUNT(*) as cnt FROM tv_series');
  
  console.log('   Turso:');
  console.log(`     tmdb_id < 0: ${tursoNegative.rows[0].cnt} (المتوقع: 0)`);
  console.log(`     الإجمالي: ${tursoTotal.rows[0].cnt.toLocaleString()} (المتوقع: 44,575)`);
  
  console.log('\n═'.repeat(70));
  
  const localSuccess = localNegative.cnt === 0 && localTotal.cnt === 224070;
  const tursoSuccess = tursoNegative.rows[0].cnt === 0;
  
  if (localSuccess && tursoSuccess) {
    console.log('\n✅ نجح الحذف بالكامل - ملف المسلسلات مقفول\n');
  } else {
    console.log('\n⚠️  فيه اختلاف عن المتوقع - راجع الأرقام أعلاه\n');
  }
  
  localDb.close();
  process.exit(0);
}

backupAndDelete().catch(e => {
  console.error('❌ خطأ:', e.message);
  localDb.close();
  process.exit(1);
});
