require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function updateWithRetry(attempt = 1) {
  try {
    console.log(`محاولة ${attempt}...`);
    const result = await turso.execute("UPDATE tv_series SET slug = slug || '-' || tmdb_id");
    console.log('✅ تم تحديث:', result.rowsAffected, 'صف');
    process.exit(0);
  } catch (e) {
    console.error(`❌ خطأ في المحاولة ${attempt}:`, e.message);
    if (attempt < 3) {
      console.log(`⏳ إعادة المحاولة بعد ${attempt * 2} ثانية...`);
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      return updateWithRetry(attempt + 1);
    }
    console.error('❌ فشل بعد 3 محاولات');
    process.exit(1);
  }
}

updateWithRetry();
