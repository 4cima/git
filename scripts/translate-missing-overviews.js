#!/usr/bin/env node
/**
 * 🌐 ترجمة الأوصاف المفقودة
 * ترجمة الأوصاف الإنجليزية للعربية للأعمال التي بدون وصف عربي
 */

require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');
const { translateContent } = require('./services/translation-service-cjs');
const pLimit = require('p-limit').default || require('p-limit');

console.log('🌐 ترجمة الأوصاف المفقودة\n');
console.log('═'.repeat(100));

const CONCURRENCY = 30;
const limiter = pLimit(CONCURRENCY);

const stats = {
  moviesTranslated: 0,
  seriesTranslated: 0,
  errors: 0,
  start: Date.now()
};

async function translateOverview(overviewEn) {
  try {
    if (!overviewEn || overviewEn.length < 10) return null;
    const result = await translateContent(overviewEn, 'en', 'ar');
    return result || null;
  } catch (error) {
    return null;
  }
}

async function processMovies() {
  console.log('\n🎬 معالجة الأفلام:\n');
  
  const movies = db.prepare(`
    SELECT id, overview_en FROM movies 
    WHERE overview_ar IS NULL AND overview_en IS NOT NULL
    AND overview_en != ''
    LIMIT 5000
  `).all();
  
  console.log(`📊 عدد الأفلام المراد ترجمة أوصافها: ${movies.length.toLocaleString()}\n`);
  
  let processed = 0;
  const startTime = Date.now();
  
  const tasks = movies.map(movie => 
    limiter(async () => {
      try {
        const overviewAr = await translateOverview(movie.overview_en);
        if (overviewAr) {
          db.prepare('UPDATE movies SET overview_ar = ? WHERE id = ?').run(overviewAr, movie.id);
          stats.moviesTranslated++;
        }
        
        processed++;
        if (processed % 50 === 0) {
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
  console.log(`\n✅ تم ترجمة: ${stats.moviesTranslated.toLocaleString()} فيلم`);
}

async function processSeries() {
  console.log('\n📺 معالجة المسلسلات:\n');
  
  const series = db.prepare(`
    SELECT id, overview_en FROM tv_series 
    WHERE overview_ar IS NULL AND overview_en IS NOT NULL
    AND overview_en != ''
    LIMIT 5000
  `).all();
  
  console.log(`📊 عدد المسلسلات المراد ترجمة أوصافها: ${series.length.toLocaleString()}\n`);
  
  let processed = 0;
  const startTime = Date.now();
  
  const tasks = series.map(s => 
    limiter(async () => {
      try {
        const overviewAr = await translateOverview(s.overview_en);
        if (overviewAr) {
          db.prepare('UPDATE tv_series SET overview_ar = ? WHERE id = ?').run(overviewAr, s.id);
          stats.seriesTranslated++;
        }
        
        processed++;
        if (processed % 50 === 0) {
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
  console.log(`\n✅ تم ترجمة: ${stats.seriesTranslated.toLocaleString()} مسلسل`);
}

async function main() {
  try {
    await processMovies();
    await processSeries();
    
    const totalTime = ((Date.now() - stats.start) / 1000 / 60).toFixed(1);
    console.log('\n' + '═'.repeat(100));
    console.log('✅ اكتملت العملية!\n');
    console.log(`📊 الإحصائيات:`);
    console.log(`   🎬 أفلام تم ترجمة أوصافها: ${stats.moviesTranslated.toLocaleString()}`);
    console.log(`   📺 مسلسلات تم ترجمة أوصافها: ${stats.seriesTranslated.toLocaleString()}`);
    console.log(`   📈 الإجمالي: ${(stats.moviesTranslated + stats.seriesTranslated).toLocaleString()}`);
    console.log(`   ❌ أخطاء: ${stats.errors}`);
    console.log(`   ⏱️  الوقت: ${totalTime} دقيقة\n`);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

main();
