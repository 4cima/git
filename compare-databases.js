require('dotenv').config({ path: '.env.local' });
const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const localDb = new Database('./data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('🔍 مقارنة قاعدة البيانات المحلية و Turso\n');
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
  console.log(`   إجمالي: ${localMovies.total.toLocaleString()}`);
  console.log(`   ✅ مسحوب: ${localMovies.fetched.toLocaleString()}`);
  console.log(`   ❌ لم يُسحب: ${localMovies.not_fetched.toLocaleString()}`);
  console.log(`   ✅ مكتمل: ${localMovies.complete.toLocaleString()}`);
  console.log(`   🚫 مفلتر: ${localMovies.filtered.toLocaleString()}`);
  console.log(`   🔄 مزامن إلى Turso: ${localMovies.synced.toLocaleString()}`);

  console.log('\n📊 بيانات Turso:');
  console.log(`   إجمالي: ${tursoMovies.rows[0][0].toLocaleString()}`);

  const diff = localMovies.synced - tursoMovies.rows[0][0];
  console.log(`\n📈 الفرق: ${diff > 0 ? '+' : ''}${diff.toLocaleString()} (محلي - Turso)`);

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
  console.log(`   إجمالي: ${localSeries.total.toLocaleString()}`);
  console.log(`   ✅ مسحوب: ${localSeries.fetched.toLocaleString()}`);
  console.log(`   ❌ لم يُسحب: ${localSeries.not_fetched.toLocaleString()}`);
  console.log(`   ✅ مكتمل: ${localSeries.complete.toLocaleString()}`);
  console.log(`   🚫 مفلتر: ${localSeries.filtered.toLocaleString()}`);
  console.log(`   🔄 مزامن إلى Turso: ${localSeries.synced.toLocaleString()}`);

  console.log('\n📊 بيانات Turso:');
  console.log(`   إجمالي: ${tursoSeries.rows[0][0].toLocaleString()}`);

  const diffSeries = localSeries.synced - tursoSeries.rows[0][0];
  console.log(`\n📈 الفرق: ${diffSeries > 0 ? '+' : ''}${diffSeries.toLocaleString()} (محلي - Turso)`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3️⃣ الممثلين
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n👥 الممثلين:');
  console.log('─'.repeat(100));

  const localPeople = localDb.prepare(`
    SELECT COUNT(*) as total FROM people
  `).get();

  const tursoPeople = await turso.execute(`
    SELECT COUNT(*) as total FROM people
  `);

  console.log('📊 البيانات المحلية:');
  console.log(`   إجمالي: ${localPeople.total.toLocaleString()}`);

  console.log('\n📊 بيانات Turso:');
  console.log(`   إجمالي: ${tursoPeople.rows[0][0].toLocaleString()}`);

  const diffPeople = localPeople.total - tursoPeople.rows[0][0];
  console.log(`\n📈 الفرق: ${diffPeople > 0 ? '+' : ''}${diffPeople.toLocaleString()} (محلي - Turso)`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4️⃣ Cast/Crew
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n🎭 Cast/Crew:');
  console.log('─'.repeat(100));

  const localCast = localDb.prepare(`
    SELECT COUNT(*) as total FROM cast_crew
  `).get();

  const tursoCast = await turso.execute(`
    SELECT COUNT(*) as total FROM cast_crew
  `);

  console.log('📊 البيانات المحلية:');
  console.log(`   إجمالي: ${localCast.total.toLocaleString()}`);

  console.log('\n📊 بيانات Turso:');
  console.log(`   إجمالي: ${tursoCast.rows[0][0].toLocaleString()}`);

  const diffCast = localCast.total - tursoCast.rows[0][0];
  console.log(`\n📈 الفرق: ${diffCast > 0 ? '+' : ''}${diffCast.toLocaleString()} (محلي - Turso)`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5️⃣ المواسم والحلقات
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n🎬 المواسم والحلقات:');
  console.log('─'.repeat(100));

  const localSeasons = localDb.prepare(`
    SELECT COUNT(*) as total FROM seasons
  `).get();

  const localEpisodes = localDb.prepare(`
    SELECT COUNT(*) as total FROM episodes
  `).get();

  const tursoSeasons = await turso.execute(`
    SELECT COUNT(*) as total FROM seasons
  `);

  const tursoEpisodes = await turso.execute(`
    SELECT COUNT(*) as total FROM episodes
  `);

  console.log('📊 البيانات المحلية:');
  console.log(`   المواسم: ${localSeasons.total.toLocaleString()}`);
  console.log(`   الحلقات: ${localEpisodes.total.toLocaleString()}`);

  console.log('\n📊 بيانات Turso:');
  console.log(`   المواسم: ${tursoSeasons.rows[0][0].toLocaleString()}`);
  console.log(`   الحلقات: ${tursoEpisodes.rows[0][0].toLocaleString()}`);

  const diffSeasons = localSeasons.total - tursoSeasons.rows[0][0];
  const diffEpisodes = localEpisodes.total - tursoEpisodes.rows[0][0];
  console.log('\n📈 الفرق:');
  console.log(`   المواسم: ${diffSeasons > 0 ? '+' : ''}${diffSeasons.toLocaleString()}`);
  console.log(`   الحلقات: ${diffEpisodes > 0 ? '+' : ''}${diffEpisodes.toLocaleString()}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6️⃣ الملخص
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n📊 الملخص:');
  console.log('═'.repeat(100));

  console.log('\n🏠 قاعدة البيانات المحلية:');
  console.log(`   🎬 أفلام: ${localMovies.total.toLocaleString()}`);
  console.log(`   📺 مسلسلات: ${localSeries.total.toLocaleString()}`);
  console.log(`   👥 ممثلين: ${localPeople.total.toLocaleString()}`);
  console.log(`   🎭 Cast/Crew: ${localCast.total.toLocaleString()}`);
  console.log(`   🎬 مواسم: ${localSeasons.total.toLocaleString()}`);
  console.log(`   📺 حلقات: ${localEpisodes.total.toLocaleString()}`);

  console.log('\n☁️  قاعدة Turso:');
  console.log(`   🎬 أفلام: ${tursoMovies.rows[0][0].toLocaleString()}`);
  console.log(`   📺 مسلسلات: ${tursoSeries.rows[0][0].toLocaleString()}`);
  console.log(`   👥 ممثلين: ${tursoPeople.rows[0][0].toLocaleString()}`);
  console.log(`   🎭 Cast/Crew: ${tursoCast.rows[0][0].toLocaleString()}`);
  console.log(`   🎬 مواسم: ${tursoSeasons.rows[0][0].toLocaleString()}`);
  console.log(`   📺 حلقات: ${tursoEpisodes.rows[0][0].toLocaleString()}`);

  console.log('\n📈 الفروقات (محلي - Turso):');
  console.log(`   🎬 أفلام: ${diff > 0 ? '+' : ''}${diff.toLocaleString()}`);
  console.log(`   📺 مسلسلات: ${diffSeries > 0 ? '+' : ''}${diffSeries.toLocaleString()}`);
  console.log(`   👥 ممثلين: ${diffPeople > 0 ? '+' : ''}${diffPeople.toLocaleString()}`);
  console.log(`   🎭 Cast/Crew: ${diffCast > 0 ? '+' : ''}${diffCast.toLocaleString()}`);
  console.log(`   🎬 مواسم: ${diffSeasons > 0 ? '+' : ''}${diffSeasons.toLocaleString()}`);
  console.log(`   📺 حلقات: ${diffEpisodes > 0 ? '+' : ''}${diffEpisodes.toLocaleString()}`);

  console.log('\n' + '═'.repeat(100) + '\n');

  localDb.close();
}

main().catch(console.error);
