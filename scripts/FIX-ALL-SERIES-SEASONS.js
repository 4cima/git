require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');
const pLimit = require('p-limit').default || require('p-limit');

const TMDB_KEY = process.env.TMDB_API_KEY_2 || '1298554bf3b09eee57972f0876ad096e';
const TMDB_URL = 'https://api.themoviedb.org/3';
const CONCURRENCY = 50; // أقل من السكريبت الرئيسي لتجنب الحظر
const limiter = pLimit(CONCURRENCY);

const stats = {
  processed: 0,
  success: 0,
  failed: 0,
  seasons: 0,
  episodes: 0,
  start: Date.now()
};

async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

async function fixSeries(id) {
  try {
    const series = await fetchTMDB(`/tv/${id}`);
    
    const validSeasons = (series.seasons || []).filter(s => s.season_number > 0);
    
    if (validSeasons.length === 0) {
      stats.failed++;
      return;
    }
    
    const insertSeason = db.prepare(`
      INSERT OR IGNORE INTO seasons
      (series_id, tmdb_id, season_number, title_en, overview_en,
       poster_path, air_date, air_year, episode_count, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    const insertEpisode = db.prepare(`
      INSERT OR IGNORE INTO episodes
      (series_id, season_id, tmdb_id, episode_number, season_number,
       title_en, overview_en, still_path, air_date, runtime,
       vote_average, is_active, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'tmdb')
    `);
    
    // سحب كل المواسم بشكل متزامن
    const seasonDetailsPromises = validSeasons.map(season => 
      limiter(async () => {
        try {
          const seasonDetails = await fetchTMDB(`/tv/${id}/season/${season.season_number}`);
          return { season, seasonDetails };
        } catch {
          return { season, seasonDetails: null };
        }
      })
    );
    
    const seasonResults = await Promise.all(seasonDetailsPromises);
    
    let seriesSeasons = 0;
    let seriesEpisodes = 0;
    
    for (const { season, seasonDetails } of seasonResults) {
      insertSeason.run(
        id, season.id, season.season_number,
        season.name, season.overview,
        season.poster_path, season.air_date,
        season.air_date ? parseInt(season.air_date.split('-')[0]) : null,
        season.episode_count || 0
      );
      
      const seasonRecord = db.prepare(
        'SELECT id FROM seasons WHERE series_id = ? AND season_number = ?'
      ).get(id, season.season_number);
      
      if (!seasonRecord) continue;
      
      seriesSeasons++;
      stats.seasons++;
      
      const episodesData = seasonDetails?.episodes || [];
      
      for (const ep of episodesData) {
        insertEpisode.run(
          id, seasonRecord.id, ep.id,
          ep.episode_number, ep.season_number,
          ep.name, ep.overview,
          ep.still_path, ep.air_date,
          ep.runtime, ep.vote_average || 0
        );
        seriesEpisodes++;
        stats.episodes++;
      }
    }
    
    if (seriesSeasons > 0) {
      stats.success++;
    } else {
      stats.failed++;
    }
    
  } catch (e) {
    stats.failed++;
    if (process.env.DEBUG) {
      console.error(`❌ خطأ في المسلسل ${id}: ${e.message}`);
    }
  }
  
  stats.processed++;
  
  if (stats.processed % 10 === 0) {
    const elapsed = (Date.now() - stats.start) / 60000;
    const rate = (stats.processed / elapsed).toFixed(0);
    console.log(
      `✅ ${stats.processed} | ` +
      `نجح: ${stats.success} | ` +
      `فشل: ${stats.failed} | ` +
      `${stats.seasons} موسم | ` +
      `${stats.episodes} حلقة | ` +
      `${rate}/دقيقة`
    );
  }
}

async function main() {
  console.log('\n🔧 إصلاح المسلسلات المكتملة بدون مواسم\n');
  console.log('='.repeat(70));
  
  const seriesWithoutSeasons = db.prepare(`
    SELECT id, title_en
    FROM tv_series
    WHERE is_complete = 1
      AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_id = id)
    ORDER BY id
  `).all();
  
  console.log(`\n📊 وجدنا ${seriesWithoutSeasons.length} مسلسل مكتمل بدون مواسم\n`);
  
  if (seriesWithoutSeasons.length === 0) {
    console.log('✅ ممتاز! لا توجد مسلسلات مكتملة بدون مواسم!\n');
    return;
  }
  
  console.log('🔄 بدء الإصلاح...\n');
  
  // معالجة دفعات صغيرة
  const BATCH_SIZE = 100;
  for (let i = 0; i < seriesWithoutSeasons.length; i += BATCH_SIZE) {
    const batch = seriesWithoutSeasons.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(s => fixSeries(s.id)));
  }
  
  const elapsed = (Date.now() - stats.start) / 60000;
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ اكتمل الإصلاح!');
  console.log('='.repeat(70));
  console.log(`\n📊 الإحصائيات:`);
  console.log(`   معالج: ${stats.processed}`);
  console.log(`   نجح: ${stats.success}`);
  console.log(`   فشل: ${stats.failed}`);
  console.log(`   المواسم: ${stats.seasons}`);
  console.log(`   الحلقات: ${stats.episodes}`);
  console.log(`   الوقت: ${elapsed.toFixed(1)} دقيقة`);
  console.log(`   السرعة: ${(stats.processed / elapsed).toFixed(0)} مسلسل/دقيقة\n`);
  
  // التحقق النهائي
  const remaining = db.prepare(`
    SELECT COUNT(*) as count
    FROM tv_series
    WHERE is_complete = 1
      AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_id = id)
  `).get();
  
  console.log(`📊 المسلسلات المكتملة بدون مواسم المتبقية: ${remaining.count}\n`);
  
  if (remaining.count === 0) {
    console.log('✅ ممتاز! تم إصلاح كل المسلسلات!\n');
  } else {
    console.log(`⚠️  لا يزال هناك ${remaining.count} مسلسل يحتاج إصلاح\n`);
  }
}

main().catch(console.error);
