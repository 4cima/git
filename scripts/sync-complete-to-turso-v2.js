const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const localDb = new Database('./data/4cima-local.db');

const BATCH_SIZE = 500; // أقصى حجم
const DELAY_BETWEEN_BATCHES = 0; // بدون تأخير
const PARALLEL_BATCHES = 5; // تشغيل 5 batches بالتوازي

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanValue(val) {
  if (val === null || val === undefined) return null;
  if (Buffer.isBuffer(val)) return val.toString('utf-8');
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

function createSlug(title, tmdbId) {
  if (!title) return `content-${tmdbId}`;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100) + `-${tmdbId}`;
}

async function syncMovies() {
  console.log('\n📽️  مزامنة الأفلام المكتملة...');
  
  const completedMovies = localDb.prepare(`
    SELECT * FROM movies 
    WHERE is_complete = 1
      AND (title_en IS NOT NULL OR title_ar IS NOT NULL)
      AND (title_en != '' OR title_ar != '')
    ORDER BY popularity DESC, vote_count DESC
  `).all();
  
  console.log(`   وجدت ${completedMovies.length.toLocaleString('ar-EG')} فيلم مكتمل في المحلية`);
  
  const tursoResult = await turso.execute('SELECT tmdb_id FROM movies');
  const tursoIds = new Set(tursoResult.rows.map(row => Number(row.tmdb_id)));
  
  console.log(`   موجود ${tursoIds.size.toLocaleString('ar-EG')} فيلم في Turso`);
  
  const newMovies = completedMovies.filter(m => !tursoIds.has(m.tmdb_id));
  console.log(`   سيتم إضافة ${newMovies.length.toLocaleString('ar-EG')} فيلم جديد`);
  
  if (newMovies.length === 0) {
    console.log('   ✅ جميع الأفلام المكتملة موجودة بالفعل في Turso');
    return 0;
  }
  
  let synced = 0;
  let failed = 0;
  
  // Process multiple batches in parallel
  for (let i = 0; i < newMovies.length; i += BATCH_SIZE * PARALLEL_BATCHES) {
    const promises = [];
    
    for (let j = 0; j < PARALLEL_BATCHES; j++) {
      const startIdx = i + (j * BATCH_SIZE);
      if (startIdx >= newMovies.length) break;
      
      const batch = newMovies.slice(startIdx, startIdx + BATCH_SIZE);
      
      const batchPromise = Promise.all(batch.map(async (movie) => {
        try {
          // Skip if no valid title
          if (!movie.title_en && !movie.title_ar) {
            failed++;
            return;
          }
          
          const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;
          const slug = movie.slug || createSlug(movie.title_ar || movie.title_en, movie.tmdb_id);
          
          await turso.execute({
            sql: `INSERT INTO movies (
              tmdb_id, slug, title_en, title_ar, overview_ar,
              poster_path, release_date, release_year, vote_average,
              runtime, vote_count, popularity, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            args: [
              movie.tmdb_id,
              slug,
              cleanValue(movie.title_en) || cleanValue(movie.title_ar),
              cleanValue(movie.title_ar),
              cleanValue(movie.overview_ar),
              cleanValue(movie.poster_path),
              cleanValue(movie.release_date),
              releaseYear,
              movie.vote_average || 0,
              movie.runtime || 0,
              movie.vote_count || 0,
              movie.popularity || 0
            ]
          });
          synced++;
          
          if (synced % 100 === 0) {
            process.stdout.write(`\r   تم: ${synced}/${newMovies.length}`);
          }
        } catch (error) {
          failed++;
          if (!error.message.includes('UNIQUE constraint failed')) {
            console.error(`\n   ❌ خطأ في فيلم ${movie.tmdb_id}:`, error.message);
          }
        }
      }));
      
      promises.push(batchPromise);
    }
    
    await Promise.all(promises);
    
    if (DELAY_BETWEEN_BATCHES > 0 && i + BATCH_SIZE * PARALLEL_BATCHES < newMovies.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  console.log(`\n   ✅ تم مزامنة ${synced.toLocaleString('ar-EG')} فيلم`);
  if (failed > 0) {
    console.log(`   ⚠️  فشل ${failed.toLocaleString('ar-EG')} فيلم`);
  }
  
  return synced;
}

async function syncSeries() {
  console.log('\n📺 مزامنة المسلسلات المكتملة...');
  
  const completedSeries = localDb.prepare(`
    SELECT * FROM tv_series 
    WHERE is_complete = 1
      AND (title_en IS NOT NULL OR title_ar IS NOT NULL)
      AND (title_en != '' OR title_ar != '')
    ORDER BY popularity DESC, vote_count DESC
  `).all();
  
  console.log(`   وجدت ${completedSeries.length.toLocaleString('ar-EG')} مسلسل مكتمل في المحلية`);
  
  const tursoResult = await turso.execute('SELECT tmdb_id FROM tv_series');
  const tursoIds = new Set(tursoResult.rows.map(row => Number(row.tmdb_id)));
  
  console.log(`   موجود ${tursoIds.size.toLocaleString('ar-EG')} مسلسل في Turso`);
  
  const newSeries = completedSeries.filter(s => !tursoIds.has(s.tmdb_id));
  console.log(`   سيتم إضافة ${newSeries.length.toLocaleString('ar-EG')} مسلسل جديد`);
  
  if (newSeries.length === 0) {
    console.log('   ✅ جميع المسلسلات المكتملة موجودة بالفعل في Turso');
    return 0;
  }
  
  let synced = 0;
  let failed = 0;
  
  // Process multiple batches in parallel
  for (let i = 0; i < newSeries.length; i += BATCH_SIZE * PARALLEL_BATCHES) {
    const promises = [];
    
    for (let j = 0; j < PARALLEL_BATCHES; j++) {
      const startIdx = i + (j * BATCH_SIZE);
      if (startIdx >= newSeries.length) break;
      
      const batch = newSeries.slice(startIdx, startIdx + BATCH_SIZE);
      
      const batchPromise = Promise.all(batch.map(async (series) => {
        try {
          // Skip if no valid name
          if (!series.title_en && !series.title_ar) {
            failed++;
            return;
          }
          
          const firstAirYear = series.first_air_date ? parseInt(series.first_air_date.split('-')[0]) : null;
          const slug = series.slug || createSlug(series.title_ar || series.title_en, series.tmdb_id);
          
          await turso.execute({
            sql: `INSERT INTO tv_series (
              tmdb_id, slug, name_en, name_ar, overview_ar,
              poster_path, first_air_date, first_air_year, number_of_seasons,
              number_of_episodes, vote_average, vote_count, popularity,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            args: [
              series.tmdb_id,
              slug,
              cleanValue(series.title_en) || cleanValue(series.title_ar),
              cleanValue(series.title_ar),
              cleanValue(series.overview_ar),
              cleanValue(series.poster_path),
              cleanValue(series.first_air_date),
              firstAirYear,
              series.number_of_seasons || 0,
              series.number_of_episodes || 0,
              series.vote_average || 0,
              series.vote_count || 0,
              series.popularity || 0
            ]
          });
          synced++;
          
          if (synced % 100 === 0) {
            process.stdout.write(`\r   تم: ${synced}/${newSeries.length}`);
          }
        } catch (error) {
          failed++;
          if (!error.message.includes('UNIQUE constraint failed')) {
            console.error(`\n   ❌ خطأ في مسلسل ${series.tmdb_id}:`, error.message);
          }
        }
      }));
      
      promises.push(batchPromise);
    }
    
    await Promise.all(promises);
    
    if (DELAY_BETWEEN_BATCHES > 0 && i + BATCH_SIZE * PARALLEL_BATCHES < newSeries.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  console.log(`\n   ✅ تم مزامنة ${synced.toLocaleString('ar-EG')} مسلسل`);
  if (failed > 0) {
    console.log(`   ⚠️  فشل ${failed.toLocaleString('ar-EG')} مسلسل`);
  }
  
  return synced;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔄 مزامنة المحتوى المكتمل من المحلية إلى Turso');
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  try {
    const moviesSynced = await syncMovies();
    const seriesSynced = await syncSeries();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ اكتملت المزامنة!');
    console.log('='.repeat(80));
    console.log(`📊 الإحصائيات:`);
    console.log(`   أفلام مزامنة: ${moviesSynced.toLocaleString('ar-EG')}`);
    console.log(`   مسلسلات مزامنة: ${seriesSynced.toLocaleString('ar-EG')}`);
    console.log(`   الإجمالي: ${(moviesSynced + seriesSynced).toLocaleString('ar-EG')}`);
    console.log(`   الوقت المستغرق: ${duration} ثانية`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ خطأ في المزامنة:', error);
  } finally {
    localDb.close();
  }
}

main().catch(console.error);
