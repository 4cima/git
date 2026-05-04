require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('🔍 فحص بيانات قاعدة Turso\n');
  console.log('═'.repeat(100));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1️⃣ الأفلام
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🎬 الأفلام:');
  console.log('─'.repeat(100));

  const moviesStats = await turso.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN title_ar IS NOT NULL AND title_ar != '' THEN 1 ELSE 0 END) as with_ar_name,
      SUM(CASE WHEN overview_ar IS NOT NULL AND overview_ar != '' THEN 1 ELSE 0 END) as with_ar_overview,
      SUM(CASE WHEN poster_path IS NOT NULL AND poster_path != '' THEN 1 ELSE 0 END) as with_poster,
      SUM(CASE WHEN title_ar IS NULL OR title_ar = '' THEN 1 ELSE 0 END) as missing_ar_name,
      SUM(CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 ELSE 0 END) as missing_ar_overview,
      SUM(CASE WHEN poster_path IS NULL OR poster_path = '' THEN 1 ELSE 0 END) as missing_poster
    FROM movies
  `);

  const moviesRow = moviesStats.rows[0];
  console.log(`📊 الإجمالي: ${moviesRow[0].toLocaleString()}`);
  console.log(`✅ مع اسم عربي: ${moviesRow[1].toLocaleString()} (${((moviesRow[1] / moviesRow[0]) * 100).toFixed(1)}%)`);
  console.log(`✅ مع وصف عربي: ${moviesRow[2].toLocaleString()} (${((moviesRow[2] / moviesRow[0]) * 100).toFixed(1)}%)`);
  console.log(`✅ مع صورة: ${moviesRow[3].toLocaleString()} (${((moviesRow[3] / moviesRow[0]) * 100).toFixed(1)}%)`);
  console.log(`❌ بدون اسم عربي: ${moviesRow[4].toLocaleString()}`);
  console.log(`❌ بدون وصف عربي: ${moviesRow[5].toLocaleString()}`);
  console.log(`❌ بدون صورة: ${moviesRow[6].toLocaleString()}`);

  // عينة من الأفلام بدون بيانات عربية
  if (moviesRow[4] > 0 || moviesRow[5] > 0) {
    console.log('\n📋 عينة من الأفلام الناقصة:');
    const sample = await turso.execute(`
      SELECT id, title_en, title_ar, overview_ar, poster_path FROM movies
      WHERE (title_ar IS NULL OR title_ar = '' OR overview_ar IS NULL OR overview_ar = '')
      LIMIT 5
    `);
    sample.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ID: ${row[0]} | ${row[1]}`);
      console.log(`      - اسم عربي: ${row[2] ? '✅' : '❌'}`);
      console.log(`      - وصف عربي: ${row[3] ? '✅' : '❌'}`);
      console.log(`      - صورة: ${row[4] ? '✅' : '❌'}`);
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2️⃣ المسلسلات
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n📺 المسلسلات:');
  console.log('─'.repeat(100));

  const seriesStats = await turso.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN name_ar IS NOT NULL AND name_ar != '' THEN 1 ELSE 0 END) as with_ar_name,
      SUM(CASE WHEN overview_ar IS NOT NULL AND overview_ar != '' THEN 1 ELSE 0 END) as with_ar_overview,
      SUM(CASE WHEN poster_path IS NOT NULL AND poster_path != '' THEN 1 ELSE 0 END) as with_poster,
      SUM(CASE WHEN name_ar IS NULL OR name_ar = '' THEN 1 ELSE 0 END) as missing_ar_name,
      SUM(CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 ELSE 0 END) as missing_ar_overview,
      SUM(CASE WHEN poster_path IS NULL OR poster_path = '' THEN 1 ELSE 0 END) as missing_poster
    FROM tv_series
  `);

  const seriesRow = seriesStats.rows[0];
  console.log(`📊 الإجمالي: ${seriesRow[0].toLocaleString()}`);
  console.log(`✅ مع اسم عربي: ${seriesRow[1].toLocaleString()} (${((seriesRow[1] / seriesRow[0]) * 100).toFixed(1)}%)`);
  console.log(`✅ مع وصف عربي: ${seriesRow[2].toLocaleString()} (${((seriesRow[2] / seriesRow[0]) * 100).toFixed(1)}%)`);
  console.log(`✅ مع صورة: ${seriesRow[3].toLocaleString()} (${((seriesRow[3] / seriesRow[0]) * 100).toFixed(1)}%)`);
  console.log(`❌ بدون اسم عربي: ${seriesRow[4].toLocaleString()}`);
  console.log(`❌ بدون وصف عربي: ${seriesRow[5].toLocaleString()}`);
  console.log(`❌ بدون صورة: ${seriesRow[6].toLocaleString()}`);

  // عينة من المسلسلات بدون بيانات عربية
  if (seriesRow[4] > 0 || seriesRow[5] > 0) {
    console.log('\n📋 عينة من المسلسلات الناقصة:');
    const sample = await turso.execute(`
      SELECT id, name_en, name_ar, overview_ar, poster_path FROM tv_series
      WHERE (name_ar IS NULL OR name_ar = '' OR overview_ar IS NULL OR overview_ar = '')
      LIMIT 5
    `);
    sample.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ID: ${row[0]} | ${row[1]}`);
      console.log(`      - اسم عربي: ${row[2] ? '✅' : '❌'}`);
      console.log(`      - وصف عربي: ${row[3] ? '✅' : '❌'}`);
      console.log(`      - صورة: ${row[4] ? '✅' : '❌'}`);
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3️⃣ الملخص
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n📊 الملخص:');
  console.log('═'.repeat(100));

  const totalMovies = moviesRow[0];
  const totalSeries = seriesRow[0];
  const completeMovies = moviesRow[1] > 0 && moviesRow[2] > 0 && moviesRow[3] > 0 ? 
    Math.min(moviesRow[1], moviesRow[2], moviesRow[3]) : 0;
  const completeSeries = seriesRow[1] > 0 && seriesRow[2] > 0 && seriesRow[3] > 0 ? 
    Math.min(seriesRow[1], seriesRow[2], seriesRow[3]) : 0;

  console.log('\n🎬 الأفلام:');
  console.log(`   📦 إجمالي: ${totalMovies.toLocaleString()}`);
  console.log(`   ✅ مكتملة (اسم عربي + وصف عربي + صورة): ${completeMovies.toLocaleString()} (${((completeMovies / totalMovies) * 100).toFixed(1)}%)`);
  console.log(`   ❌ ناقصة: ${(totalMovies - completeMovies).toLocaleString()} (${(((totalMovies - completeMovies) / totalMovies) * 100).toFixed(1)}%)`);

  console.log('\n📺 المسلسلات:');
  console.log(`   📦 إجمالي: ${totalSeries.toLocaleString()}`);
  console.log(`   ✅ مكتملة (اسم عربي + وصف عربي + صورة): ${completeSeries.toLocaleString()} (${((completeSeries / totalSeries) * 100).toFixed(1)}%)`);
  console.log(`   ❌ ناقصة: ${(totalSeries - completeSeries).toLocaleString()} (${(((totalSeries - completeSeries) / totalSeries) * 100).toFixed(1)}%)`);

  console.log('\n📈 الحالة العامة:');
  const totalComplete = completeMovies + completeSeries;
  const totalAll = totalMovies + totalSeries;
  console.log(`   ✅ إجمالي المكتملة: ${totalComplete.toLocaleString()} من ${totalAll.toLocaleString()} (${((totalComplete / totalAll) * 100).toFixed(1)}%)`);
  console.log(`   ❌ إجمالي الناقصة: ${(totalAll - totalComplete).toLocaleString()} (${(((totalAll - totalComplete) / totalAll) * 100).toFixed(1)}%)`);

  console.log('\n' + '═'.repeat(100) + '\n');
}

main().catch(console.error);
