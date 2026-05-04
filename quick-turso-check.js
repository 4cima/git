require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  console.log('🔍 فحص سريع لبيانات Turso\n');

  try {
    // الأفلام
    const m = await turso.execute('SELECT COUNT(*) as cnt FROM movies');
    const mAr = await turso.execute('SELECT COUNT(*) as cnt FROM movies WHERE title_ar IS NOT NULL AND title_ar != \'\'');
    const mOv = await turso.execute('SELECT COUNT(*) as cnt FROM movies WHERE overview_ar IS NOT NULL AND overview_ar != \'\'');
    const mPo = await turso.execute('SELECT COUNT(*) as cnt FROM movies WHERE poster_path IS NOT NULL AND poster_path != \'\'');
    const mComp = await turso.execute('SELECT COUNT(*) as cnt FROM movies WHERE title_ar IS NOT NULL AND title_ar != \'\' AND overview_ar IS NOT NULL AND overview_ar != \'\' AND poster_path IS NOT NULL AND poster_path != \'\'');

    const moviesTotal = m.rows[0][0];
    const moviesAr = mAr.rows[0][0];
    const moviesOv = mOv.rows[0][0];
    const moviesPo = mPo.rows[0][0];
    const moviesComp = mComp.rows[0][0];

    console.log('🎬 الأفلام:');
    console.log(`  📊 الإجمالي: ${moviesTotal.toLocaleString()}`);
    console.log(`  ✅ مع عنوان عربي: ${moviesAr.toLocaleString()} (${((moviesAr/moviesTotal)*100).toFixed(1)}%)`);
    console.log(`  ✅ مع وصف عربي: ${moviesOv.toLocaleString()} (${((moviesOv/moviesTotal)*100).toFixed(1)}%)`);
    console.log(`  ✅ مع صورة: ${moviesPo.toLocaleString()} (${((moviesPo/moviesTotal)*100).toFixed(1)}%)`);
    console.log(`  🎯 مكتملة: ${moviesComp.toLocaleString()} (${((moviesComp/moviesTotal)*100).toFixed(1)}%)\n`);

    // المسلسلات
    const s = await turso.execute('SELECT COUNT(*) as cnt FROM tv_series');
    const sAr = await turso.execute('SELECT COUNT(*) as cnt FROM tv_series WHERE name_ar IS NOT NULL AND name_ar != \'\'');
    const sOv = await turso.execute('SELECT COUNT(*) as cnt FROM tv_series WHERE overview_ar IS NOT NULL AND overview_ar != \'\'');
    const sPo = await turso.execute('SELECT COUNT(*) as cnt FROM tv_series WHERE poster_path IS NOT NULL AND poster_path != \'\'');
    const sComp = await turso.execute('SELECT COUNT(*) as cnt FROM tv_series WHERE name_ar IS NOT NULL AND name_ar != \'\' AND overview_ar IS NOT NULL AND overview_ar != \'\' AND poster_path IS NOT NULL AND poster_path != \'\'');

    const seriesTotal = s.rows[0][0];
    const seriesAr = sAr.rows[0][0];
    const seriesOv = sOv.rows[0][0];
    const seriesPo = sPo.rows[0][0];
    const seriesComp = sComp.rows[0][0];

    console.log('📺 المسلسلات:');
    console.log(`  📊 الإجمالي: ${seriesTotal.toLocaleString()}`);
    console.log(`  ✅ مع اسم عربي: ${seriesAr.toLocaleString()} (${((seriesAr/seriesTotal)*100).toFixed(1)}%)`);
    console.log(`  ✅ مع وصف عربي: ${seriesOv.toLocaleString()} (${((seriesOv/seriesTotal)*100).toFixed(1)}%)`);
    console.log(`  ✅ مع صورة: ${seriesPo.toLocaleString()} (${((seriesPo/seriesTotal)*100).toFixed(1)}%)`);
    console.log(`  🎯 مكتملة: ${seriesComp.toLocaleString()} (${((seriesComp/seriesTotal)*100).toFixed(1)}%)\n`);

    // الملخص
    const totalAll = moviesTotal + seriesTotal;
    const completeAll = moviesComp + seriesComp;

    console.log('═'.repeat(60));
    console.log('📈 الملخص الشامل:');
    console.log(`  📦 إجمالي الأعمال: ${totalAll.toLocaleString()}`);
    console.log(`  ✅ مكتملة: ${completeAll.toLocaleString()} (${((completeAll/totalAll)*100).toFixed(1)}%)`);
    console.log(`  ❌ ناقصة: ${(totalAll-completeAll).toLocaleString()} (${(((totalAll-completeAll)/totalAll)*100).toFixed(1)}%)`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
})();
