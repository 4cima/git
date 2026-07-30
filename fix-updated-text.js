require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

(async () => {
  console.log('🔧 بدء إصلاح الأسماء في Turso...\n');
  
  // Fix movie Ariel
  await client.execute({
    sql: "UPDATE movies SET title_ar = ?, updated_at = datetime('now') WHERE tmdb_id = ?",
    args: ['أرييل', 2]
  });
  console.log('✅ تم تصحيح فيلم Ariel');
  console.log('   القديم: أرييل - محدث');
  console.log('   الجديد: أرييل\n');
  
  // Fix series Mrs Pritchard
  await client.execute({
    sql: "UPDATE tv_series SET name_ar = ?, updated_at = datetime('now') WHERE tmdb_id = ?",
    args: ['السيدة بريتشارد المذهلة', 4]
  });
  console.log('✅ تم تصحيح مسلسل The Amazing Mrs Pritchard');
  console.log('   القديم: السيدة بريتشارد المذهلة - محدث');
  console.log('   الجديد: السيدة بريتشارد المذهلة\n');
  
  // Verify the fix
  const verifyMovie = await client.execute({
    sql: 'SELECT tmdb_id, title_ar FROM movies WHERE tmdb_id = ?',
    args: [2]
  });
  
  const verifySeries = await client.execute({
    sql: 'SELECT tmdb_id, name_ar FROM tv_series WHERE tmdb_id = ?',
    args: [4]
  });
  
  console.log('🔍 التحقق من الإصلاح:\n');
  console.log('فيلم Ariel:', verifyMovie.rows[0].title_ar);
  console.log('مسلسل Mrs Pritchard:', verifySeries.rows[0].name_ar);
  
  // Final check for any remaining issues
  const moviesCheck = await client.execute({
    sql: "SELECT COUNT(*) as count FROM movies WHERE title_ar LIKE '%محدث%'",
  });
  
  const seriesCheck = await client.execute({
    sql: "SELECT COUNT(*) as count FROM tv_series WHERE name_ar LIKE '%محدث%'",
  });
  
  const totalRemaining = moviesCheck.rows[0].count + seriesCheck.rows[0].count;
  
  console.log('\n✅ عدد الأعمال المتبقية بكلمة "محدث":', totalRemaining);
  console.log('\n🎉 تم الإصلاح بنجاح!');
})();
