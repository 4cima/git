require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

turso.execute("UPDATE tv_series SET slug = slug || '-' || tmdb_id")
  .then(r => {
    console.log('✅ تم تحديث:', r.rowsAffected, 'صف');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  });
