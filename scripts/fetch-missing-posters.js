#!/usr/bin/env node
/**
 * 🖼️ جلب الملصقات المفقودة
 * البحث عن ملصقات بديلة من TMDB أو مصادر أخرى
 */

require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');
const pLimit = require('p-limit').default || require('p-limit');

console.log('🖼️ جلب الملصقات المفقودة\n');
console.log('═'.repeat(100));

const TMDB_KEY = process.env.TMDB_API_KEY || 'afef094e7c0de13c1cac98227a61da4d';
const TMDB_URL = 'https://api.themoviedb.org/3';
const CONCURRENCY = 50;
const limiter = pLimit(CONCURRENCY);

const stats = {
  moviesFound: 0,
  seriesFound: 0,
  errors: 0,
  start: Date.now()
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchTMDB(endpoint, params = {}, retries = 3) {
  const url = new URL(`${TMDB_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url.toString());
      if (res.status === 429) {
        await sleep((attempt + 1) * 5000);
        continue;
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await sleep(1000);
    }
  }
}

async function fetchMoviePoster(tmdbId) {
  try {
    const data = await fetchTMDB(`/movie/${tmdbId}`, { language: 'en-US' });
    return data?.poster_path || null;
  } catch (error) {
    return null;
  }
}

async function fetchSeriesPoster(tmdbId) {
  try {
    const data = await fetchTMDB(`/tv/${tmdbId}`, { language: 'en-US' });
    return data?.poster_path || null;
  } catch (error) {
    return null;
  }
}

async function processMovies() {
  console.log('\n🎬 معالجة الأفلام:\n');
  
  const movies = db.prepare(`
    SELECT id, tmdb_id FROM movies 
    WHERE poster_path IS NULL AND tmdb_id IS NOT NULL
    LIMIT 5000
  `).all();
  
  console.log(`📊 عدد الأفلام المراد جلب ملصقاتها: ${movies.length.toLocaleString()}\n`);
  
  let processed = 0;
  const startTime = Date.now();
  
  const tasks = movies.map(movie => 
    limiter(async () => {
      try {
        const posterPath = await fetchMoviePoster(movie.tmdb_id);
        if (posterPath) {
          db.prepare('UPDATE movies SET poster_path = ? WHERE id = ?').run(posterPath, movie.id);
          stats.moviesFound++;
        }
        
        processed++;
        if (processed % 100 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
          const rate = (processed / elapsed).toFixed(0);
          const percent = ((processed / movies.length) * 100).toFixed(1);
          const eta = ((movies.length - processed) / (processed / elapsed) / 60).toFixed(0);
          console.log(`⏳ ${processed.toLocaleString()} / ${movies.length.toLocaleString()} (${percent}%) | ${rate}/دقيقة | ETA: ${eta} دقيقة`);
        }
      } catch (error) {
        stats.errors++;
      }
    })
  );
  
  await Promise.all(tasks);
  console.log(`\n✅ تم جلب: ${stats.moviesFound.toLocaleString()} ملصق`);
}

async function processSeries() {
  console.log('\n📺 معالجة المسلسلات:\n');
  
  const series = db.prepare(`
    SELECT id, tmdb_id FROM tv_series 
    WHERE poster_path IS NULL AND tmdb_id IS NOT NULL
    LIMIT 5000
  `).all();
  
  console.log(`📊 عدد المسلسلات المراد جلب ملصقاتها: ${series.length.toLocaleString()}\n`);
  
  let processed = 0;
  const startTime = Date.now();
  
  const tasks = series.map(s => 
    limiter(async () => {
      try {
        const posterPath = await fetchSeriesPoster(s.tmdb_id);
        if (posterPath) {
          db.prepare('UPDATE tv_series SET poster_path = ? WHERE id = ?').run(posterPath, s.id);
          stats.seriesFound++;
        }
        
        processed++;
        if (processed % 100 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
          const rate = (processed / elapsed).toFixed(0);
          const percent = ((processed / series.length) * 100).toFixed(1);
          const eta = ((series.length - processed) / (processed / elapsed) / 60).toFixed(0);
          console.log(`⏳ ${processed.toLocaleString()} / ${series.length.toLocaleString()} (${percent}%) | ${rate}/دقيقة | ETA: ${eta} دقيقة`);
        }
      } catch (error) {
        stats.errors++;
      }
    })
  );
  
  await Promise.all(tasks);
  console.log(`\n✅ تم جلب: ${stats.seriesFound.toLocaleString()} ملصق`);
}

async function main() {
  try {
    await processMovies();
    await processSeries();
    
    const totalTime = ((Date.now() - stats.start) / 1000 / 60).toFixed(1);
    console.log('\n' + '═'.repeat(100));
    console.log('✅ اكتملت العملية!\n');
    console.log(`📊 الإحصائيات:`);
    console.log(`   🎬 ملصقات أفلام تم جلبها: ${stats.moviesFound.toLocaleString()}`);
    console.log(`   📺 ملصقات مسلسلات تم جلبها: ${stats.seriesFound.toLocaleString()}`);
    console.log(`   📈 الإجمالي: ${(stats.moviesFound + stats.seriesFound).toLocaleString()}`);
    console.log(`   ❌ أخطاء: ${stats.errors}`);
    console.log(`   ⏱️  الوقت: ${totalTime} دقيقة\n`);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

main();
