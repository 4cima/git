const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', '4cima-local.db');
const db = new Database(dbPath, { readonly: true });

try {
  console.log('📊 ملخص القاعدة المحلية (data/4cima-local.db)\n');
  console.log('═'.repeat(70));

  // Movies statistics
  const totalMovies = db.prepare('SELECT COUNT(*) as count FROM movies').get().count;
  const fetchedMovies = db.prepare('SELECT COUNT(*) as count FROM movies WHERE is_fetched = 1').get().count;
  const completeMovies = db.prepare('SELECT COUNT(*) as count FROM movies WHERE is_complete = 1').get().count;
  const filteredMovies = db.prepare('SELECT COUNT(*) as count FROM movies WHERE is_filtered = 1').get().count;
  const cleanMovies = db.prepare(`SELECT COUNT(*) as count FROM movies WHERE filter_status = 'clean'`).get().count;
  const syncedMovies = db.prepare('SELECT COUNT(*) as count FROM movies WHERE synced_to_turso = 1').get().count;

  console.log('🎬 الأفلام:');
  console.log(`   إجمالي: ${totalMovies.toLocaleString()}`);
  console.log(`   مسحوب (fetched): ${fetchedMovies.toLocaleString()}`);
  console.log(`   كامل (complete): ${completeMovies.toLocaleString()}`);
  console.log(`   نظيف (clean): ${cleanMovies.toLocaleString()}`);
  console.log(`   مفلتر (filtered): ${filteredMovies.toLocaleString()}`);
  console.log(`   متزامن لـ Turso: ${syncedMovies.toLocaleString()}`);

  // Series statistics
  const totalSeries = db.prepare('SELECT COUNT(*) as count FROM tv_series').get().count;
  const fetchedSeries = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE is_fetched = 1').get().count;
  const completeSeries = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE is_complete = 1').get().count;
  const filteredSeries = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE is_filtered = 1').get().count;
  const cleanSeries = db.prepare(`SELECT COUNT(*) as count FROM tv_series WHERE filter_status = 'clean'`).get().count;
  const syncedSeries = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE synced_to_turso = 1').get().count;

  console.log('\n📺 المسلسلات:');
  console.log(`   إجمالي: ${totalSeries.toLocaleString()}`);
  console.log(`   مسحوب (fetched): ${fetchedSeries.toLocaleString()}`);
  console.log(`   كامل (complete): ${completeSeries.toLocaleString()}`);
  console.log(`   نظيف (clean): ${cleanSeries.toLocaleString()}`);
  console.log(`   مفلتر (filtered): ${filteredSeries.toLocaleString()}`);
  console.log(`   متزامن لـ Turso: ${syncedSeries.toLocaleString()}`);

  // Other tables
  const totalGenres = db.prepare('SELECT COUNT(*) as count FROM genres').get().count;
  const totalPeople = db.prepare('SELECT COUNT(*) as count FROM people').get().count;
  const totalCastCrew = db.prepare('SELECT COUNT(*) as count FROM cast_crew').get().count;
  const totalSeasons = db.prepare('SELECT COUNT(*) as count FROM seasons').get().count;
  const totalEpisodes = db.prepare('SELECT COUNT(*) as count FROM episodes').get().count;

  console.log('\n📚 البيانات الإضافية:');
  console.log(`   الأنواع (genres): ${totalGenres.toLocaleString()}`);
  console.log(`   الأشخاص (people): ${totalPeople.toLocaleString()}`);
  console.log(`   الممثلين/الطاقم (cast_crew): ${totalCastCrew.toLocaleString()}`);
  console.log(`   المواسم (seasons): ${totalSeasons.toLocaleString()}`);
  console.log(`   الحلقات (episodes): ${totalEpisodes.toLocaleString()}`);

  // Database size
  const stats = require('fs').statSync(dbPath);
  const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log('\n💾 حجم القاعدة:');
  console.log(`   ${sizeInMB} MB`);

  console.log('═'.repeat(70));

} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
