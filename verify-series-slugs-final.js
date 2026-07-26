require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// دالة الفحص من test-id-suffix.js
function hasIdSuffix(slug, tmdbId) {
  const suffix = '-' + tmdbId;
  if (!slug.endsWith(suffix)) return false;
  
  const beforeSuffix = slug.slice(0, -suffix.length);
  return beforeSuffix.length > 0 && !beforeSuffix.endsWith('-');
}

async function verify() {
  console.log('\n🔍 فحص نهائي للمسلسلات في Turso\n');
  console.log('═'.repeat(70));
  
  // 1. عدد المسلسلات المحدثة
  console.log('\n1️⃣ إحصائيات عامة:\n');
  const total = await turso.execute('SELECT COUNT(*) as cnt FROM tv_series');
  console.log(`   إجمالي المسلسلات: ${total.rows[0].cnt.toLocaleString()}`);
  
  // 2. فحص التكرار (على المسلسلات الحقيقية فقط)
  console.log('\n2️⃣ فحص التكرار:\n');
  const duplicates = await turso.execute(`
    SELECT slug, COUNT(*) as cnt
    FROM tv_series
    WHERE slug NOT LIKE 'temp-%'
    GROUP BY slug
    HAVING COUNT(*) > 1
    LIMIT 10
  `);
  
  console.log(`   slugs مكررة: ${duplicates.rows.length}`);
  if (duplicates.rows.length > 0) {
    console.log('\n   أمثلة:');
    duplicates.rows.forEach(r => {
      console.log(`     - ${r.slug}: ${r.cnt} مرات`);
    });
  }
  
  // 3. فحص IDs (hasIdSuffix)
  console.log('\n3️⃣ فحص IDs في الـ slugs:\n');
  const series = await turso.execute(`
    SELECT slug, tmdb_id
    FROM tv_series
    WHERE slug NOT LIKE 'temp-%'
    LIMIT 5000
  `);
  
  const withIds = series.rows.filter(r => hasIdSuffix(r.slug, r.tmdb_id));
  console.log(`   فحص ${series.rows.length.toLocaleString()} مسلسل`);
  console.log(`   slugs فيها IDs: ${withIds.length}`);
  
  if (withIds.length > 0) {
    console.log('\n   أمثلة:');
    withIds.slice(0, 10).forEach(r => {
      console.log(`     - tmdb=${r.tmdb_id}, slug="${r.slug}"`);
    });
  }
  
  // 4. عينة عشوائية
  console.log('\n4️⃣ عينة عشوائية (10 مسلسلات):\n');
  const samples = await turso.execute(`
    SELECT slug, tmdb_id
    FROM tv_series
    WHERE slug NOT LIKE 'temp-%'
    ORDER BY RANDOM()
    LIMIT 10
  `);
  
  samples.rows.forEach(r => {
    console.log(`   tmdb=${r.tmdb_id}: ${r.slug}`);
  });
  
  console.log('\n═'.repeat(70));
  console.log('\n📊 الخلاصة:\n');
  console.log(`   ${duplicates.rows.length === 0 ? '✅' : '❌'} صفر تكرارات`);
  console.log(`   ${withIds.length === 0 ? '✅' : '❌'} صفر IDs`);
  console.log('\n');
  
  process.exit(0);
}

verify().catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
