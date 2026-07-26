require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');

console.log('\n🔄 نقل البيانات من الجداول القديمة\n');
console.log('='.repeat(70));

// التحقق من وجود البيانات
const oldSeasons = db.prepare('SELECT COUNT(*) as count FROM tv_seasons').get();
const oldEpisodes = db.prepare('SELECT COUNT(*) as count FROM tv_episodes').get();

console.log(`\n📊 البيانات في الجداول القديمة:`);
console.log(`   tv_seasons: ${oldSeasons.count.toLocaleString()} موسم`);
console.log(`   tv_episodes: ${oldEpisodes.count.toLocaleString()} حلقة`);

if (oldSeasons.count === 0 && oldEpisodes.count === 0) {
  console.log('\n✅ لا توجد بيانات للنقل!\n');
  process.exit(0);
}

console.log('\n🔄 بدء النقل...\n');

const stats = {
  seasons: 0,
  episodes: 0,
  errors: 0
};

// نقل المواسم
console.log('📦 نقل المواسم...');

const seasonsToMigrate = db.prepare(`
  SELECT * FROM tv_seasons
`).all();

const insertSeason = db.prepare(`
  INSERT OR IGNORE INTO seasons
  (series_id, tmdb_id, season_number, title_en, title_ar, overview_en, overview_ar,
   poster_path, air_date, air_year, episode_count, is_active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const season of seasonsToMigrate) {
  try {
    insertSeason.run(
      season.tv_series_id,  // series_id
      season.tmdb_id,
      season.season_number,
      season.name_en,       // title_en
      season.title_ar,
      season.overview_en,
      season.overview_ar,
      season.poster_path,
      season.air_date,
      season.air_year,
      season.episode_count,
      season.is_active,
      season.created_at
    );
    stats.seasons++;
  } catch (e) {
    stats.errors++;
    if (process.env.DEBUG) {
      console.error(`❌ خطأ في نقل الموسم ${season.id}: ${e.message}`);
    }
  }
  
  if (stats.seasons % 1000 === 0) {
    console.log(`   ✅ ${stats.seasons.toLocaleString()} موسم`);
  }
}

console.log(`✅ تم نقل ${stats.seasons.toLocaleString()} موسم\n`);

// نقل الحلقات
console.log('📦 نقل الحلقات...');

const episodesToMigrate = db.prepare(`
  SELECT * FROM tv_episodes
`).all();

const insertEpisode = db.prepare(`
  INSERT OR IGNORE INTO episodes
  (series_id, season_id, tmdb_id, episode_number, season_number,
   title_en, title_ar, overview_en, overview_ar, still_path,
   air_date, runtime, vote_average, is_active, source, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const episode of episodesToMigrate) {
  try {
    // البحث عن season_id الجديد
    const newSeason = db.prepare(`
      SELECT id FROM seasons 
      WHERE series_id = ? AND season_number = ?
    `).get(episode.tv_series_id, episode.season_number);
    
    if (!newSeason) {
      stats.errors++;
      continue;
    }
    
    insertEpisode.run(
      episode.tv_series_id,  // series_id
      newSeason.id,          // season_id الجديد
      episode.tmdb_id,
      episode.episode_number,
      episode.season_number,
      episode.name_en,       // title_en
      episode.title_ar,
      episode.overview_en,
      episode.overview_ar,
      episode.still_path,
      episode.air_date,
      episode.runtime,
      episode.vote_average,
      episode.is_active,
      episode.source,
      episode.created_at
    );
    stats.episodes++;
  } catch (e) {
    stats.errors++;
    if (process.env.DEBUG) {
      console.error(`❌ خطأ في نقل الحلقة ${episode.id}: ${e.message}`);
    }
  }
  
  if (stats.episodes % 10000 === 0) {
    console.log(`   ✅ ${stats.episodes.toLocaleString()} حلقة`);
  }
}

console.log(`✅ تم نقل ${stats.episodes.toLocaleString()} حلقة\n`);

// التحقق من النتائج
const newSeasons = db.prepare('SELECT COUNT(*) as count FROM seasons').get();
const newEpisodes = db.prepare('SELECT COUNT(*) as count FROM episodes').get();

console.log('='.repeat(70));
console.log('📊 النتائج:');
console.log('='.repeat(70));
console.log(`\n✅ المواسم المنقولة: ${stats.seasons.toLocaleString()}`);
console.log(`✅ الحلقات المنقولة: ${stats.episodes.toLocaleString()}`);
console.log(`❌ الأخطاء: ${stats.errors.toLocaleString()}`);

console.log(`\n📊 الإجمالي في الجداول الجديدة:`);
console.log(`   seasons: ${newSeasons.count.toLocaleString()} موسم`);
console.log(`   episodes: ${newEpisodes.count.toLocaleString()} حلقة`);

// تحديث is_complete للمسلسلات
console.log(`\n🔄 تحديث حالة المسلسلات...`);

const updated = db.prepare(`
  UPDATE tv_series
  SET is_complete = 0
  WHERE is_complete = 1
    AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_id = tv_series.id)
`).run();

console.log(`✅ تم تحديث ${updated.changes} مسلسل\n`);

console.log('='.repeat(70));
console.log('✅ اكتمل النقل بنجاح!');
console.log('='.repeat(70) + '\n');
