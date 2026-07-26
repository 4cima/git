require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 اختبار اتصال Turso البسيط...\n');

turso.execute('SELECT 1 as test')
  .then(r => {
    console.log('✅ الاتصال يعمل!');
    console.log('   النتيجة:', r.rows[0]);
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ فشل الاتصال:', e.message);
    process.exit(1);
  });
