#!/usr/bin/env node
/**
 * 🌐 ترجمة الأسماء المفقودة
 * ترجمة الأسماء الإنجليزية للعربية للأعمال التي بدون اسم عربي
 */

require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');
const { translateContent } = require('./services/translation-service-cjs');
const pLimit = require('p-limit').default || require('p-limit');

console.log('🌐 ترجمة الأسماء المفقودة\n');
console.log('═'.repeat(100));

const CONCURRENCY = 50;
const limiter = pLimit(CONCURRENCY);

const stats = {
  moviesTranslated: 0,
  seriesTranslated: 0,
  errors: 0,
  start: Date.now()
};

async function translateTitle(titleEn) {
  try {
    const result = await translateContent(titleEn, 'en', 'ar');
    return result || titleEn;
  } catch (error) {
    return null;
  }
}

async function processMovies() {
  console.log('\n🎬 معالجة الأفلام:\n');
  
  const movies = db.prepare(`
    SELECT id, title_en FROM movies 
    WHERE title_ar IS NULL AND title_en IS NOT NULL
    LIMIT 10000
  `).all();
  
  console.log(`📊 عدد الأفلام المراد ترجمة أسماؤها: ${movies.length.toLocaleString()}\n`);
  
  let processed = 0;
  const startTime = Date.now();
  
  const tasks = movies.map(movie => 
    limiter(async () => {
      try {
        const titleAr = await translateTitle(movie.title_en);
        if (titleAr && titleAr !== movie.title_en) {
          db.prepare('UPDATE movies SET title_ar = ? WHERE id = ?').run(titleAr, movie.id);
          stats.moviesTranslated++;
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
  console.log(`\n✅ تم ترجمة: ${stats.moviesTranslated.toLocaleString()} فيلم`);
}

async function processSeries() {
  console.log('\n📺 معالجة المسلسلات:\n');
  
  const series = db.prepare(`
    SELECT id, name_en FROM tv_series 
    WHERE name_ar IS NULL AND name_en IS NOT NULL
    LIMIT 10000
  `).all();
  
  console.log(`📊 عدد المسلسلات المراد ترجمة أسماؤها: ${series.length.toLocaleString()}\n`);
  
  let processed = 0;
  const startTime = Date.now();
  
  const tasks = series.map(s => 
    limiter(async () => {
      try {
        const nameAr = await translateTitle(s.name_en);
        if (nameAr && nameAr !== s.name_en) {
          db.prepare('UPDATE tv_series SET name_ar = ? WHERE id = ?').run(nameAr, s.id);
          stats.seriesTranslated++;
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
    console.log(`   🎬 أفلام تم ترجمة أسماؤها: ${stats.moviesTranslated.toLocaleString()}`);
    console.log(`   📺 مسلسلات تم ترجمة أسماؤها: ${stats.seriesTranslated.toLocaleString()}`);
    console.log(`   📈 الإجمالي: ${(stats.moviesTranslated + stats.seriesTranslated).toLocaleString()}`);
    console.log(`   ❌ أخطاء: ${stats.errors}`);
    console.log(`   ⏱️  الوقت: ${totalTime} دقيقة\n`);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

main();
