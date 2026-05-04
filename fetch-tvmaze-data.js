require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const https = require('https');

const db = new Database('./data/4cima-local.db');

const TVMAZE_API_BASE = 'https://api.tvmaze.com';
const RATE_LIMIT_DELAY = 500; // 500ms بين الطلبات (20 طلب/10 ثواني)
const BATCH_SIZE = 50;

let stats = {
  processed: 0,
  updated: 0,
  errors: 0,
  postersFound: 0,
  overviewsFound: 0,
  keywordsFound: 0,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchFromTVMaze(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': '4cima-bot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchTVMazeShow(tmdbId) {
  try {
    // البحث عن العرض بـ TMDB ID
    const searchUrl = `${TVMAZE_API_BASE}/lookup/shows?thetvdb=${tmdbId}`;
    const show = await fetchFromTVMaze(searchUrl);
    
    if (!show || !show.id) return null;
    
    return {
      tvmazeId: show.id,
      poster: show.image?.original || null,
      overview: show.summary ? show.summary.replace(/<[^>]*>/g, '') : null,
      genres: show.genres || [],
      status: show.status || null,
      rating: show.rating?.average || null,
    };
  } catch (error) {
    return null;
  }
}

async function updateSeriesWithTVMazeData(seriesId, tvmazeData) {
  try {
    const series = db.prepare('SELECT * FROM tv_series WHERE id = ?').get(seriesId);
    if (!series) return false;

    let updated = false;
    let updateQuery = 'UPDATE tv_series SET ';
    let updates = [];
    let params = [];

    // تحديث الملصق
    if (tvmazeData.poster && !series.poster_path) {
      updates.push('poster_path = ?');
      params.push(tvmazeData.poster);
      stats.postersFound++;
      updated = true;
    }

    // تحديث الوصف
    if (tvmazeData.overview && !series.overview_ar) {
      updates.push('overview_ar = ?');
      params.push(tvmazeData.overview);
      stats.overviewsFound++;
      updated = true;
    }

    // تحديث الكلمات المفتاحية
    if (tvmazeData.genres && tvmazeData.genres.length > 0) {
      const currentKeywords = series.keywords ? JSON.parse(series.keywords) : [];
      const newKeywords = [...new Set([...currentKeywords, ...tvmazeData.genres])];
      updates.push('keywords = ?');
      params.push(JSON.stringify(newKeywords));
      stats.keywordsFound++;
      updated = true;
    }

    if (updated) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(seriesId);

      updateQuery += updates.join(', ') + ' WHERE id = ?';
      db.prepare(updateQuery).run(...params);
      stats.updated++;
      return true;
    }

    return false;
  } catch (error) {
    stats.errors++;
    return false;
  }
}

async function main() {
  console.log('🚀 سحب البيانات من TVMaze\n');
  console.log('═'.repeat(80));

  // الحصول على المسلسلات الناقصة
  const incompleteSeries = db.prepare(`
    SELECT id, tmdb_id FROM tv_series 
    WHERE is_complete = 0 AND is_filtered = 0
    AND (poster_path IS NULL OR overview_ar IS NULL OR keywords IS NULL OR keywords = '[]')
    LIMIT 1000
  `).all();

  console.log(`📺 المسلسلات الناقصة: ${incompleteSeries.length.toLocaleString()}\n`);

  const startTime = Date.now();
  let processed = 0;

  for (const series of incompleteSeries) {
    try {
      // سحب البيانات من TVMaze
      const tvmazeData = await fetchTVMazeShow(series.tmdb_id);
      
      if (tvmazeData) {
        await updateSeriesWithTVMazeData(series.id, tvmazeData);
      }

      processed++;
      stats.processed++;

      // عرض التقدم
      if (processed % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const rate = (processed / elapsed * 60).toFixed(0);
        const percent = ((processed / incompleteSeries.length) * 100).toFixed(1);
        const eta = ((incompleteSeries.length - processed) / (processed / elapsed) / 60).toFixed(0);
        
        console.log(`⏳ ${processed.toLocaleString()} / ${incompleteSeries.length.toLocaleString()} (${percent}%) | ${rate}/دقيقة | ETA: ${eta} دقيقة`);
      }

      // احترام حد المعدل
      await sleep(RATE_LIMIT_DELAY);
    } catch (error) {
      stats.errors++;
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '═'.repeat(80));
  console.log('✅ اكتملت العملية!');
  console.log('═'.repeat(80));
  console.log(`\n📊 الإحصائيات:`);
  console.log(`   📺 المعالج: ${stats.processed.toLocaleString()}`);
  console.log(`   ✅ المحدث: ${stats.updated.toLocaleString()}`);
  console.log(`   🖼️  ملصقات مضافة: ${stats.postersFound.toLocaleString()}`);
  console.log(`   📝 أوصاف مضافة: ${stats.overviewsFound.toLocaleString()}`);
  console.log(`   🏷️  كلمات مفتاحية مضافة: ${stats.keywordsFound.toLocaleString()}`);
  console.log(`   ❌ أخطاء: ${stats.errors.toLocaleString()}`);
  console.log(`   ⏱️  الوقت: ${totalTime} دقيقة`);
  console.log(`   ⚡ السرعة: ${(stats.processed / totalTime).toFixed(0)} عمل/دقيقة\n`);

  db.close();
}

main().catch(console.error);
