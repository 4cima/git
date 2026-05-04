require('dotenv').config({ path: '.env.local' });
const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const localDb = new Database('./data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('🔍 مقارنة تفصيلية بين قاعدة البيانات المحلية و Turso\n');
  console.log('═'.repeat(100));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1️⃣ الأفلام
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🎬 الأفلام:');
  console.log('─'.repeat(100));

  const localMovies = localDb.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN overview_en IS NOT NULL THEN 1 ELSE 0 END) as fetched,
      SUM(CASE WHEN overview_en IS NULL AND is_filtered = 0 THEN 1 ELSE 0 END) as not_fetched,
      SUM(CASE WHEN is_complete = 1 AND is_filtered = 0 THEN 1 ELSE 0 END) as complete,
      SUM(CASE WHEN is_filtered = 1 THEN 1 ELSE 0 END) as filtered,
      SUM(CASE WHEN synced_to_turso = 1 THEN 1 ELSE 0 END) as synced
    FROM movies
  `).get();

  const tursoMovies = await turso.execute(`
    SELECT COUNT(*) as total FROM movies
  `);

  console.log('📊 البيانات المحلية:');
  console.log(`   📦 إجمالي IDs: ${localMovies.total.toLocaleString()}`);
  console.log(`   ✅ مسحوب من TMDB: ${localMovies.fetched.toLocaleString()} (${((localMovies.fetched / localMovies.total) * 100).toFixed(1)}%)`);
  console.log(`   ❌ لم يُسحب: ${localMovies.not_fetched.toLocaleString()}`);
  console.log(`   ✅ مكتمل: ${localMovies.complete.toLocaleString()}`);
  console.log(`   🚫 مفلتر: ${localMovies.filtered.toLocaleString()}`);
  console.log(`   🔄 مزامن إلى Turso: ${localMovies.synced.toLocaleString()}`);

  console.log('\n☁️  بيانات Turso:');
  console.log(`   📦 إجمالي: ${tursoMovies.rows[0][0].toLocaleString()}`);

  const diffMovies = localMovies.synced - tursoMovies.rows[0][0];
  console.log(`\n📈 الفرق: ${diffMovies > 0 ? '+' : ''}${diffMovies.toLocaleString()} (محلي - Turso)`);
  if (diffMovies !== 0) {
    console.log(`   ⚠️  يوجد ${Math.abs(diffMovies).toLocaleString()} فيلم ${diffMovies > 0 ? 'لم يتم مزامنته' : 'تم حذفه من Turso'}`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2️⃣ المسلسلات
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n📺 المسلسلات:');
  console.log('─'.repeat(100));

  const localSeries = localDb.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN overview_en IS NOT NULL THEN 1 ELSE 0 END) as fetched,
      SUM(CASE WHEN overview_en IS NULL AND is_filtered = 0 THEN 1 ELSE 0 END) as not_fetched,
      SUM(CASE WHEN is_complete = 1 AND is_filtered = 0 THEN 1 ELSE 0 END) as complete,
      SUM(CASE WHEN is_filtered = 1 THEN 1 ELSE 0 END) as filtered,
      SUM(CASE WHEN synced_to_turso = 1 THEN 1 ELSE 0 END) as synced
    FROM tv_series
  `).get();

  const tursoSeries = await turso.execute(`
    SELECT COUNT(*) as total FROM tv_series
  `);

  console.log('📊 البيانات المحلية:');
  console.log(`   📦 إجمالي IDs: ${localSeries.total.toLocaleString()}`);
  console.log(`   ✅ مسحوب من TMDB: ${localSeries.fetched.toLocaleString()} (${((localSeries.fetched / localSeries.total) * 100).toFixed(1)}%)`);
  console.log(`   ❌ لم يُسحب: ${localSeries.not_fetched.toLocaleString()}`);
  console.log(`   ✅ مكتمل: ${localSeries.complete.toLocaleString()}`);
  console.log(`   🚫 مفلتر: ${localSeries.filtered.toLocaleString()}`);
  console.log(`   🔄 مزامن إلى Turso: ${localSeries.synced.toLocaleString()}`);

  console.log('\n☁️  بيانات Turso:');
  console.log(`   📦 إجمالي: ${tursoSeries.rows[0][0].toLocaleString()}`);

  const diffSeries = localSeries.synced - tursoSeries.rows[0][0];
  console.log(`\n📈 الفرق: ${diffSeries > 0 ? '+' : ''}${diffSeries.toLocaleString()} (محلي - Turso)`);
  if (diffSeries !== 0) {
    console.log(`   ⚠️  يوجد ${Math.abs(diffSeries).toLocaleString()} مسلسل ${diffSeries > 0 ? 'لم يتم مزامنته' : 'تم حذفه من Turso'}`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3️⃣ Cast/Crew
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n🎭 Cast/Crew:');
  console.log('─'.repeat(100));

  const localCast = localDb.prepare(`
    SELECT COUNT(*) as total FROM cast_crew
  `).get();

  try {
    const tursoCast = await turso.execute(`
      SELECT COUNT(*) as total FROM cast_crew
    `);
    console.log('📊 البيانات المحلية:');
    console.log(`   إجمالي: ${localCast.total.toLocaleString()}`);
    console.log('\n☁️  بيانات Turso:');
    console.log(`   إجمالي: ${tursoCast.rows[0][0].toLocaleString()}`);
    const diffCast = localCast.total - tursoCast.rows[0][0];
    console.log(`\n📈 الفرق: ${diffCast > 0 ? '+' : ''}${diffCast.toLocaleString()}`);
  } catch (e) {
    console.log('📊 البيانات المحلية:');
    console.log(`   إجمالي: ${localCast.total.toLocaleString()}`);
    console.log('\n☁️  بيانات Turso:');
    console.log(`   ⚠️  جدول cast_crew غير موجود في Turso`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4️⃣ المواسم والحلقات
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n🎬 المواسم والحلقات:');
  console.log('─'.repeat(100));

  const localSeasons = localDb.prepare(`
    SELECT COUNT(*) as total FROM seasons
  `).get();

  const localEpisodes = localDb.prepare(`
    SELECT COUNT(*) as total FROM episodes
  `).get();

  try {
    const tursoSeasons = await turso.execute(`
      SELECT COUNT(*) as total FROM seasons
    `);
    const tursoEpisodes = await turso.execute(`
      SELECT COUNT(*) as total FROM episodes
    `);

    console.log('📊 البيانات المحلية:');
    console.log(`   🎬 المواسم: ${localSeasons.total.toLocaleString()}`);
    console.log(`   📺 الحلقات: ${localEpisodes.total.toLocaleString()}`);

    console.log('\n☁️  بيانات Turso:');
    console.log(`   🎬 المواسم: ${tursoSeasons.rows[0][0].toLocaleString()}`);
    console.log(`   📺 الحلقات: ${tursoEpisodes.rows[0][0].toLocaleString()}`);

    const diffSeasons = localSeasons.total - tursoSeasons.rows[0][0];
    const diffEpisodes = localEpisodes.total - tursoEpisodes.rows[0][0];
    console.log('\n📈 الفرق:');
    console.log(`   🎬 المواسم: ${diffSeasons > 0 ? '+' : ''}${diffSeasons.toLocaleString()}`);
    console.log(`   📺 الحلقات: ${diffEpisodes > 0 ? '+' : ''}${diffEpisodes.toLocaleString()}`);
  } catch (e) {
    console.log('📊 البيانات المحلية:');
    console.log(`   🎬 المواسم: ${localSeasons.total.toLocaleString()}`);
    console.log(`   📺 الحلقات: ${localEpisodes.total.toLocaleString()}`);
    console.log('\n☁️  بيانات Turso:');
    console.log(`   ⚠️  جداول seasons/episodes غير موجودة في Turso`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5️⃣ الملخص النهائي
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n📊 الملخص النهائي:');
  console.log('═'.repeat(100));

  console.log('\n🏠 قاعدة البيانات المحلية:');
  console.log(`   🎬 أفلام: ${localMovies.total.toLocaleString()} (${localMovies.fetched.toLocaleString()} مسحوب)`);
  console.log(`   📺 مسلسلات: ${localSeries.total.toLocaleString()} (${localSeries.fetched.toLocaleString()} مسحوب)`);
  console.log(`   🎭 Cast/Crew: ${localCast.total.toLocaleString()}`);
  console.log(`   🎬 مواسم: ${localSeasons.total.toLocaleString()}`);
  console.log(`   📺 حلقات: ${localEpisodes.total.toLocaleString()}`);

  console.log('\n☁️  قاعدة Turso:');
  console.log(`   🎬 أفلام: ${tursoMovies.rows[0][0].toLocaleString()}`);
  console.log(`   📺 مسلسلات: ${tursoSeries.rows[0][0].toLocaleString()}`);

  console.log('\n📈 الحالة:');
  if (diffMovies === 0 && diffSeries === 0) {
    console.log('   ✅ جميع البيانات مزامنة بشكل صحيح!');
  } else {
    console.log('   ⚠️  يوجد فروقات:');
    if (diffMovies !== 0) console.log(`      - أفلام: ${Math.abs(diffMovies).toLocaleString()} ${diffMovies > 0 ? 'لم تُمزامن' : 'حُذفت'}`);
    if (diffSeries !== 0) console.log(`      - مسلسلات: ${Math.abs(diffSeries).toLocaleString()} ${diffSeries > 0 ? 'لم تُمزامن' : 'حُذفت'}`);
  }

  console.log('\n' + '═'.repeat(100) + '\n');
}

main().catch(console.error);
