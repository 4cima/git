require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const localDb = new Database('./data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  console.log('🔍 تشخيص دقيق: لماذا لا يوجد وصف عربي؟\n');
  console.log('═'.repeat(80));

  try {
    // 1️⃣ الأفلام بدون وصف عربي في Turso
    console.log('\n🎬 الأفلام بدون وصف عربي في Turso:\n');

    const moviesWithoutAr = await turso.execute(`
      SELECT id, title_en, title_ar, overview_ar, poster_path
      FROM movies
      WHERE (overview_ar IS NULL OR overview_ar = '')
      LIMIT 10
    `);

    console.log(`📊 عدد الأفلام بدون وصف عربي: ${moviesWithoutAr.rows.length}`);
    console.log('\nعينات:\n');

    for (const row of moviesWithoutAr.rows) {
      const id = row[0];
      const titleEn = row[1];
      const titleAr = row[2];
      const overviewAr = row[3];
      const posterPath = row[4];

      console.log(`ID: ${id}`);
      console.log(`  العنوان الإنجليزي: ${titleEn}`);
      console.log(`  العنوان العربي: ${titleAr || 'غير موجود'}`);
      console.log(`  الوصف العربي: ${overviewAr || 'غير موجود'}`);
      console.log(`  الصورة: ${posterPath ? 'موجودة' : 'غير موجودة'}`);

      // البحث في القاعدة المحلية
      const localMovie = localDb.prepare(`
        SELECT id, title_en, title_ar, overview_ar, overview_en, is_fetched, is_filtered, is_complete
        FROM movies
        WHERE tmdb_id = ?
      `).get(id);

      if (localMovie) {
        console.log(`  📚 في القاعدة المحلية:`);
        console.log(`    - العنوان العربي: ${localMovie.title_ar || 'غير موجود'}`);
        console.log(`    - الوصف الإنجليزي: ${localMovie.overview_en ? 'موجود' : 'غير موجود'}`);
        console.log(`    - الوصف العربي: ${localMovie.overview_ar || 'غير موجود'}`);
        console.log(`    - تم السحب: ${localMovie.is_fetched ? 'نعم' : 'لا'}`);
        console.log(`    - مفلتر: ${localMovie.is_filtered ? 'نعم' : 'لا'}`);
        console.log(`    - مكتمل: ${localMovie.is_complete ? 'نعم' : 'لا'}`);
      } else {
        console.log(`  ⚠️ غير موجود في القاعدة المحلية!`);
      }

      console.log('');
    }

    // 2️⃣ المسلسلات بدون وصف عربي في Turso
    console.log('\n' + '═'.repeat(80));
    console.log('\n📺 المسلسلات بدون وصف عربي في Turso:\n');

    const seriesWithoutAr = await turso.execute(`
      SELECT id, name_en, name_ar, overview_ar, poster_path
      FROM tv_series
      WHERE (overview_ar IS NULL OR overview_ar = '')
      LIMIT 10
    `);

    console.log(`📊 عدد المسلسلات بدون وصف عربي: ${seriesWithoutAr.rows.length}`);
    console.log('\nعينات:\n');

    for (const row of seriesWithoutAr.rows) {
      const id = row[0];
      const nameEn = row[1];
      const nameAr = row[2];
      const overviewAr = row[3];
      const posterPath = row[4];

      console.log(`ID: ${id}`);
      console.log(`  الاسم الإنجليزي: ${nameEn}`);
      console.log(`  الاسم العربي: ${nameAr || 'غير موجود'}`);
      console.log(`  الوصف العربي: ${overviewAr || 'غير موجود'}`);
      console.log(`  الصورة: ${posterPath ? 'موجودة' : 'غير موجودة'}`);

      // البحث في القاعدة المحلية
      const localSeries = localDb.prepare(`
        SELECT id, name_en, name_ar, overview_ar, overview_en, is_fetched, is_filtered, is_complete
        FROM tv_series
        WHERE tmdb_id = ?
      `).get(id);

      if (localSeries) {
        console.log(`  📚 في القاعدة المحلية:`);
        console.log(`    - الاسم العربي: ${localSeries.name_ar || 'غير موجود'}`);
        console.log(`    - الوصف الإنجليزي: ${localSeries.overview_en ? 'موجود' : 'غير موجود'}`);
        console.log(`    - الوصف العربي: ${localSeries.overview_ar || 'غير موجود'}`);
        console.log(`    - تم السحب: ${localSeries.is_fetched ? 'نعم' : 'لا'}`);
        console.log(`    - مفلتر: ${localSeries.is_filtered ? 'نعم' : 'لا'}`);
        console.log(`    - مكتمل: ${localSeries.is_complete ? 'نعم' : 'لا'}`);
      } else {
        console.log(`  ⚠️ غير موجود في القاعدة المحلية!`);
      }

      console.log('');
    }

    // 3️⃣ تحليل الأسباب
    console.log('\n' + '═'.repeat(80));
    console.log('\n🔍 تحليل الأسباب:\n');

    // الأفلام بدون وصف عربي في القاعدة المحلية
    const moviesNoArLocal = localDb.prepare(`
      SELECT COUNT(*) as count
      FROM movies
      WHERE is_fetched = 1 AND is_filtered = 0 AND (overview_ar IS NULL OR overview_ar = '')
    `).get();

    console.log(`🎬 الأفلام في القاعدة المحلية:`);
    console.log(`  - بدون وصف عربي (مسحوبة وغير مفلترة): ${moviesNoArLocal.count}`);

    // المسلسلات بدون وصف عربي في القاعدة المحلية
    const seriesNoArLocal = localDb.prepare(`
      SELECT COUNT(*) as count
      FROM tv_series
      WHERE is_fetched = 1 AND is_filtered = 0 AND (overview_ar IS NULL OR overview_ar = '')
    `).get();

    console.log(`\n📺 المسلسلات في القاعدة المحلية:`);
    console.log(`  - بدون وصف عربي (مسحوبة وغير مفلترة): ${seriesNoArLocal.count}`);

    // الأفلام بدون وصف إنجليزي (لا يمكن ترجمتها)
    const moviesNoEnLocal = localDb.prepare(`
      SELECT COUNT(*) as count
      FROM movies
      WHERE is_fetched = 1 AND is_filtered = 0 AND (overview_en IS NULL OR overview_en = '')
    `).get();

    console.log(`\n🎬 الأفلام بدون وصف إنجليزي (لا يمكن ترجمتها):`);
    console.log(`  - ${moviesNoEnLocal.count}`);

    // المسلسلات بدون وصف إنجليزي
    const seriesNoEnLocal = localDb.prepare(`
      SELECT COUNT(*) as count
      FROM tv_series
      WHERE is_fetched = 1 AND is_filtered = 0 AND (overview_en IS NULL OR overview_en = '')
    `).get();

    console.log(`\n📺 المسلسلات بدون وصف إنجليزي:`);
    console.log(`  - ${seriesNoEnLocal.count}`);

    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ انتهى التشخيص\n');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }

  localDb.close();
})();
