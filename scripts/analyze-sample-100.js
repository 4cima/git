#!/usr/bin/env node
/**
 * 🤖 تحليل عينة من 100 عمل مفلتر
 * تجربة نظام التحليل بالذكاء الاصطناعي
 */

require('dotenv').config({ path: './.env.local' });
const db = require('./services/local-db');
const grokAnalyzer = require('./services/grok-analyzer');

console.log('🤖 تحليل عينة من 100 عمل مفلتر بواسطة Grok\n');
console.log('='.repeat(80));

// التحقق من API Key
if (!process.env.MISTRAL_API_KEY && !process.env.GROQ_API_KEY && !process.env.GROK_API_KEY && !process.env.XAI_API_KEY) {
  console.error('\n❌ خطأ: لا يوجد API Key');
  console.error('\nأضف أحد المفاتيح في .env.local:');
  console.error('MISTRAL_API_KEY=your_key_here');
  console.error('GROQ_API_KEY=your_key_here');
  console.error('XAI_API_KEY=your_key_here\n');
  process.exit(1);
}

// ============================================================================
// اختيار 100 عمل متنوع
// ============================================================================

console.log('\n📋 اختيار 100 عمل متنوع...\n');

const sample = [];

// 1. أفلام عشوائية - 50 عمل
console.log('1️⃣ أفلام عشوائية...');
const movies = db.prepare(`
  SELECT id, 'movie' as type, title_en, release_year
  FROM movies
  WHERE is_filtered = 1
  AND title_en IS NOT NULL
  AND release_year IS NOT NULL
  AND release_year <= 2024
  ORDER BY RANDOM()
  LIMIT 50
`).all();
sample.push(...movies);
console.log(`   ✅ ${movies.length} فيلم`);

// 2. مسلسلات عشوائية - 30 عمل
console.log('2️⃣ مسلسلات عشوائية...');
const series = db.prepare(`
  SELECT id, 'tv' as type, title_en, first_air_year as release_year
  FROM tv_series
  WHERE is_filtered = 1
  AND title_en IS NOT NULL
  AND first_air_year IS NOT NULL
  AND first_air_year <= 2024
  ORDER BY RANDOM()
  LIMIT 30
`).all();
sample.push(...series);
console.log(`   ✅ ${series.length} مسلسل`);

// 3. محتوى بأعلى شهرة - 20 عمل
console.log('3️⃣ محتوى بأعلى شهرة...');
const popularContent = db.prepare(`
  SELECT * FROM (
    SELECT id, 'movie' as type, title_en, release_year, popularity
    FROM movies
    WHERE is_filtered = 1
    AND popularity > 0
    AND release_year <= 2024
    ORDER BY popularity DESC
    LIMIT 10
  )
  
  UNION ALL
  
  SELECT * FROM (
    SELECT id, 'tv' as type, title_en, first_air_year as release_year, popularity
    FROM tv_series
    WHERE is_filtered = 1
    AND popularity > 0
    AND first_air_year <= 2024
    ORDER BY popularity DESC
    LIMIT 10
  )
`).all();
sample.push(...popularContent);
console.log(`   ✅ ${popularContent.length} عمل`);

console.log('\n' + '='.repeat(80));
console.log(`\n📊 إجمالي العينة: ${sample.length} عمل`);

// ============================================================================
// التحليل
// ============================================================================

console.log('\n🤖 بدء التحليل بواسطة Grok...\n');
console.log('⏱️  هذا قد يستغرق 5-10 دقائق (تأخير 3 ثواني بين كل طلب)\n');
console.log('='.repeat(80));

const results = {
  total: sample.length,
  analyzed: 0,
  failed: 0,
  unfilter: 0,
  keep_filtered: 0,
  needs_review: 0,
  errors: []
};

const startTime = Date.now();

(async () => {
  for (let i = 0; i < sample.length; i++) {
    const item = sample[i];
    
    try {
      console.log(`\n[${i + 1}/${sample.length}] ${item.title_en} (${item.release_year})`);
      
      const analysis = await grokAnalyzer.analyzeContent(item.id, item.type);
      
      results.analyzed++;
      
      if (analysis.ai_recommendation === 'unfilter') {
        results.unfilter++;
      } else if (analysis.ai_recommendation === 'keep_filtered') {
        results.keep_filtered++;
      } else {
        results.needs_review++;
      }
      
      // تأخير 3 ثواني بين الطلبات (تجنب Rate Limit)
      if (i < sample.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`   ❌ فشل: ${error.message}`);
      results.failed++;
      results.errors.push({
        title: item.title_en,
        error: error.message
      });
      
      // تأخير أطول في حالة الخطأ
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // ============================================================================
  // النتائج
  // ============================================================================
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 النتائج النهائية:\n');
  
  console.log(`⏱️  الوقت الإجمالي: ${Math.floor(totalTime / 60)} دقيقة ${totalTime % 60} ثانية`);
  console.log(`📋 إجمالي: ${results.total}`);
  console.log(`✅ تم التحليل: ${results.analyzed}`);
  console.log(`❌ فشل: ${results.failed}`);
  console.log();
  console.log(`🟢 يستحق إلغاء الفلترة: ${results.unfilter} (${((results.unfilter/results.analyzed)*100).toFixed(1)}%)`);
  console.log(`🔴 يبقى مفلتر: ${results.keep_filtered} (${((results.keep_filtered/results.analyzed)*100).toFixed(1)}%)`);
  console.log(`🟡 يحتاج مراجعة: ${results.needs_review} (${((results.needs_review/results.analyzed)*100).toFixed(1)}%)`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ الأخطاء:');
    results.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.title}: ${err.error}`);
    });
  }
  
  // ============================================================================
  // التكلفة التقديرية
  // ============================================================================
  
  console.log('\n💰 التكلفة التقديرية:');
  const costPerRequest = 0.02; // تقديري
  const totalCost = results.analyzed * costPerRequest;
  console.log(`   ${results.analyzed} تحليل × $${costPerRequest} = $${totalCost.toFixed(2)}`);
  
  // ============================================================================
  // الخطوة التالية
  // ============================================================================
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 الخطوة التالية:');
  console.log('   node scripts/review-ai-results.js');
  console.log('\n');
  
})().catch(error => {
  console.error('\n❌ خطأ فادح:', error);
  process.exit(1);
});
