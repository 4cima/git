require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const localDb = new Database('./data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixDuplicateSlugs() {
  console.log('🔧 إصلاح المسلسلات المكررة بنفس الـ slug...\n');

  try {
    // البحث عن المسلسلات المكررة
    const duplicates = await turso.execute(`
      SELECT slug, COUNT(*) as count
      FROM tv_series
      GROUP BY slug
      HAVING count > 1
    `);

    if (duplicates.rows.length === 0) {
      console.log('✅ لا توجد مسلسلات مكررة\n');
      return;
    }

    console.log(`⚠️ وجدنا ${duplicates.rows.length} slug مكرر\n`);

    for (const row of duplicates.rows) {
      const slug = row[0];
      const count = row[1];

      // الحصول على جميع المسلسلات بنفس الـ slug
      const items = await turso.execute(`
        SELECT id, name_en, name_ar
        FROM tv_series
        WHERE slug = ?
        ORDER BY id ASC
      `, [slug]);

      console.log(`📺 Slug: "${slug}" (${count} مسلسلات)`);

      // الاحتفاظ بالأول وحذف الباقي
      for (let i = 1; i < items.rows.length; i++) {
        const id = items.rows[i][0];
        const name = items.rows[i][1] || items.rows[i][2];

        console.log(`  ❌ حذف ID: ${id} (${name})`);

        await turso.execute(`
          DELETE FROM tv_series WHERE id = ?
        `, [id]);
      }
    }

    console.log('\n✅ تم إصلاح المسلسلات المكررة\n');
  } catch (error) {
    console.error('❌ خطأ في إصلاح المسلسلات:', error.message);
  }
}

async function syncRemainingWorks() {
  console.log('🔄 مزامنة الأعمال المتبقية...\n');

  try {
    // مزامنة الأفلام
    console.log('🎬 مزامنة الأفلام...');
    const movies = localDb.prepare(`
      SELECT id, tmdb_id, slug, title_en, title_ar, overview_ar, poster_path, release_year, vote_average
      FROM movies
      WHERE is_complete = 1 AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY vote_count DESC
      LIMIT 500
    `).all();

    console.log(`📦 عدد الأفلام المتبقية: ${movies.length}`);

    let syncedMovies = 0;
    for (const m of movies) {
      try {
        await turso.execute({
          sql: `
            INSERT INTO movies (tmdb_id, slug, title_en, title_ar, overview_ar, poster_path, release_year, vote_average, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tmdb_id) DO UPDATE SET
              slug = excluded.slug,
              title_en = excluded.title_en,
              title_ar = excluded.title_ar,
              overview_ar = excluded.overview_ar,
              updated_at = excluded.updated_at
          `,
          args: [
            m.tmdb_id,
            m.slug,
            m.title_en || '',
            m.title_ar || '',
            m.overview_ar || '',
            m.poster_path || '',
            m.release_year || 0,
            m.vote_average || 0,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        });

        localDb.prepare('UPDATE movies SET synced_to_turso = 1 WHERE id = ?').run(m.id);
        syncedMovies++;
      } catch (error) {
        console.error(`❌ خطأ في فيلم ${m.id}: ${error.message}`);
      }
    }

    console.log(`✅ تم مزامنة ${syncedMovies} فيلم\n`);

    // مزامنة المسلسلات
    console.log('📺 مزامنة المسلسلات...');
    const series = localDb.prepare(`
      SELECT id, tmdb_id, slug, name_en, name_ar, overview_ar, poster_path, first_air_year, vote_average
      FROM tv_series
      WHERE is_complete = 1 AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY vote_count DESC
      LIMIT 500
    `).all();

    console.log(`📦 عدد المسلسلات المتبقية: ${series.length}`);

    let syncedSeries = 0;
    for (const s of series) {
      try {
        await turso.execute({
          sql: `
            INSERT INTO tv_series (tmdb_id, slug, name_en, name_ar, overview_ar, poster_path, first_air_year, vote_average, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tmdb_id) DO UPDATE SET
              slug = excluded.slug,
              name_en = excluded.name_en,
              name_ar = excluded.name_ar,
              overview_ar = excluded.overview_ar,
              updated_at = excluded.updated_at
          `,
          args: [
            s.tmdb_id,
            s.slug,
            s.name_en || '',
            s.name_ar || '',
            s.overview_ar || '',
            s.poster_path || '',
            s.first_air_year || 0,
            s.vote_average || 0,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        });

        localDb.prepare('UPDATE tv_series SET synced_to_turso = 1 WHERE id = ?').run(s.id);
        syncedSeries++;
      } catch (error) {
        console.error(`❌ خطأ في مسلسل ${s.id}: ${error.message}`);
      }
    }

    console.log(`✅ تم مزامنة ${syncedSeries} مسلسل\n`);
  } catch (error) {
    console.error('❌ خطأ في المزامنة:', error.message);
  }
}

async function verifyTursoData() {
  console.log('🔍 فحص شامل لبيانات Turso\n');
  console.log('═'.repeat(80));

  try {
    // فحص الأفلام
    console.log('\n🎬 الأفلام:');
    console.log('─'.repeat(80));

    const moviesStats = await turso.execute(
      `SELECT COUNT(*) as total, SUM(CASE WHEN title_ar IS NOT NULL AND title_ar != '' THEN 1 ELSE 0 END) as with_ar_title, SUM(CASE WHEN overview_ar IS NOT NULL AND overview_ar != '' THEN 1 ELSE 0 END) as with_ar_overview, SUM(CASE WHEN poster_path IS NOT NULL AND poster_path != '' THEN 1 ELSE 0 END) as with_poster FROM movies`
    );

    const moviesRow = moviesStats.rows[0];
    const totalMovies = moviesRow[0];
    const moviesWithArTitle = moviesRow[1];
    const moviesWithArOverview = moviesRow[2];
    const moviesWithPoster = moviesRow[3];

    console.log(`📊 الإجمالي: ${totalMovies.toLocaleString()}`);
    console.log(`✅ مع عنوان عربي: ${moviesWithArTitle.toLocaleString()} (${((moviesWithArTitle / totalMovies) * 100).toFixed(1)}%)`);
    console.log(`✅ مع وصف عربي: ${moviesWithArOverview.toLocaleString()} (${((moviesWithArOverview / totalMovies) * 100).toFixed(1)}%)`);
    console.log(`✅ مع صورة: ${moviesWithPoster.toLocaleString()} (${((moviesWithPoster / totalMovies) * 100).toFixed(1)}%)`);

    const moviesComplete = await turso.execute(
      `SELECT COUNT(*) as count FROM movies WHERE title_ar IS NOT NULL AND title_ar != '' AND overview_ar IS NOT NULL AND overview_ar != '' AND poster_path IS NOT NULL AND poster_path != ''`
    );

    const moviesCompleteCount = moviesComplete.rows[0][0];
    console.log(`\n🎯 الأفلام المكتملة (عنوان عربي + وصف عربي + صورة): ${moviesCompleteCount.toLocaleString()}`);
    console.log(`📊 النسبة: ${((moviesCompleteCount / totalMovies) * 100).toFixed(1)}%`);

    // فحص المسلسلات
    console.log('\n\n📺 المسلسلات:');
    console.log('─'.repeat(80));

    const seriesStats = await turso.execute(
      `SELECT COUNT(*) as total, SUM(CASE WHEN name_ar IS NOT NULL AND name_ar != '' THEN 1 ELSE 0 END) as with_ar_name, SUM(CASE WHEN overview_ar IS NOT NULL AND overview_ar != '' THEN 1 ELSE 0 END) as with_ar_overview, SUM(CASE WHEN poster_path IS NOT NULL AND poster_path != '' THEN 1 ELSE 0 END) as with_poster FROM tv_series`
    );

    const seriesRow = seriesStats.rows[0];
    const totalSeries = seriesRow[0];
    const seriesWithArName = seriesRow[1];
    const seriesWithArOverview = seriesRow[2];
    const seriesWithPoster = seriesRow[3];

    console.log(`📊 الإجمالي: ${totalSeries.toLocaleString()}`);
    console.log(`✅ مع اسم عربي: ${seriesWithArName.toLocaleString()} (${((seriesWithArName / totalSeries) * 100).toFixed(1)}%)`);
    console.log(`✅ مع وصف عربي: ${seriesWithArOverview.toLocaleString()} (${((seriesWithArOverview / totalSeries) * 100).toFixed(1)}%)`);
    console.log(`✅ مع صورة: ${seriesWithPoster.toLocaleString()} (${((seriesWithPoster / totalSeries) * 100).toFixed(1)}%)`);

    const seriesComplete = await turso.execute(
      `SELECT COUNT(*) as count FROM tv_series WHERE name_ar IS NOT NULL AND name_ar != '' AND overview_ar IS NOT NULL AND overview_ar != '' AND poster_path IS NOT NULL AND poster_path != ''`
    );

    const seriesCompleteCount = seriesComplete.rows[0][0];
    console.log(`\n🎯 المسلسلات المكتملة (اسم عربي + وصف عربي + صورة): ${seriesCompleteCount.toLocaleString()}`);
    console.log(`📊 النسبة: ${((seriesCompleteCount / totalSeries) * 100).toFixed(1)}%`);

    // الملخص الشامل
    console.log('\n\n📈 الملخص الشامل:');
    console.log('═'.repeat(80));

    const totalAll = totalMovies + totalSeries;
    const completeAll = moviesCompleteCount + seriesCompleteCount;

    console.log(`\n📦 إجمالي الأعمال: ${totalAll.toLocaleString()}`);
    console.log(`✅ مكتملة: ${completeAll.toLocaleString()} (${((completeAll / totalAll) * 100).toFixed(1)}%)`);
    console.log(`❌ ناقصة: ${(totalAll - completeAll).toLocaleString()} (${(((totalAll - completeAll) / totalAll) * 100).toFixed(1)}%)`);

    console.log('\n═'.repeat(80));
    console.log('\n✅ اكتمل الفحص الشامل!\n');
  } catch (error) {
    console.error('❌ خطأ في الفحص:', error.message);
  }
}

async function main() {
  console.log('🚀 بدء الإصلاح والتحقق\n');
  console.log('═'.repeat(80));

  await fixDuplicateSlugs();
  await syncRemainingWorks();
  await verifyTursoData();

  localDb.close();
}

main().catch(console.error);
