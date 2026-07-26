#!/usr/bin/env node
/**
 * 📊 مراجعة نتائج التحليل بالذكاء الاصطناعي
 * يعرض تقرير شامل عن التحليلات
 */

const db = require('./services/local-db');
const fs = require('fs');

console.log('📊 مراجعة نتائج التحليل بالذكاء الاصطناعي\n');
console.log('='.repeat(80));

// ============================================================================
// 1️⃣ الإحصائيات العامة
// ============================================================================

console.log('\n1️⃣ الإحصائيات العامة:\n');

const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN ai_recommendation = 'unfilter' THEN 1 END) as unfilter,
    COUNT(CASE WHEN ai_recommendation = 'keep_filtered' THEN 1 END) as keep_filtered,
    COUNT(CASE WHEN ai_recommendation = 'needs_review' THEN 1 END) as needs_review,
    AVG(confidence_score) as avg_confidence,
    AVG(ai_rating) as avg_rating,
    COUNT(CASE WHEN imdb_rating IS NOT NULL THEN 1 END) as found_on_imdb
  FROM ai_content_analysis
`).get();

console.log(`إجمالي التحليلات: ${stats.total}`);
console.log(`   🟢 يستحق إلغاء الفلترة: ${stats.unfilter} (${((stats.unfilter/stats.total)*100).toFixed(1)}%)`);
console.log(`   🔴 يبقى مفلتر: ${stats.keep_filtered} (${((stats.keep_filtered/stats.total)*100).toFixed(1)}%)`);
console.log(`   🟡 يحتاج مراجعة: ${stats.needs_review} (${((stats.needs_review/stats.total)*100).toFixed(1)}%)`);
console.log();
console.log(`متوسط الثقة: ${stats.avg_confidence.toFixed(1)}%`);
console.log(`متوسط التقييم: ${stats.avg_rating.toFixed(1)}/10`);
console.log(`وُجد على IMDb: ${stats.found_on_imdb} (${((stats.found_on_imdb/stats.total)*100).toFixed(1)}%)`);

// ============================================================================
// 2️⃣ الأعمال التي تستحق إلغاء الفلترة
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n2️⃣ الأعمال التي تستحق إلغاء الفلترة:\n');

const toUnfilter = db.prepare(`
  SELECT 
    a.*,
    CASE 
      WHEN a.content_type = 'movie' THEN m.title_en
      ELSE s.title_en
    END as title,
    CASE 
      WHEN a.content_type = 'movie' THEN m.release_year
      ELSE s.first_air_year
    END as year
  FROM ai_content_analysis a
  LEFT JOIN movies m ON a.content_type = 'movie' AND a.content_id = m.id
  LEFT JOIN tv_series s ON a.content_type = 'tv' AND a.content_id = s.id
  WHERE a.ai_recommendation = 'unfilter'
  ORDER BY a.unfilter_priority ASC, a.confidence_score DESC
`).all();

if (toUnfilter.length > 0) {
  console.log(`إجمالي: ${toUnfilter.length} عمل\n`);
  
  toUnfilter.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title} (${item.year}) - ${item.content_type}`);
    console.log(`   ⭐ AI Rating: ${item.ai_rating}/10 | Confidence: ${item.confidence_score}%`);
    if (item.imdb_rating) {
      console.log(`   📊 IMDb: ${item.imdb_rating}/10 (${item.imdb_votes?.toLocaleString() || 0} votes)`);
    }
    if (item.rotten_tomatoes_rating) {
      console.log(`   🍅 RT: ${item.rotten_tomatoes_rating}%`);
    }
    console.log(`   🎯 Priority: ${item.unfilter_priority} | Quality: ${item.content_quality}`);
    console.log(`   💬 ${item.ai_summary}`);
    console.log();
  });
} else {
  console.log('✅ لا توجد أعمال تستحق إلغاء الفلترة');
}

// ============================================================================
// 3️⃣ توزيع التقييمات
// ============================================================================

console.log('='.repeat(80));
console.log('\n3️⃣ توزيع التقييمات:\n');

const ratingDist = db.prepare(`
  SELECT 
    CASE 
      WHEN ai_rating >= 8 THEN '8-10 (ممتاز)'
      WHEN ai_rating >= 6 THEN '6-7.9 (جيد)'
      WHEN ai_rating >= 4 THEN '4-5.9 (متوسط)'
      WHEN ai_rating >= 2 THEN '2-3.9 (ضعيف)'
      ELSE '0-1.9 (سيء جداً)'
    END as range,
    COUNT(*) as count
  FROM ai_content_analysis
  GROUP BY range
  ORDER BY MIN(ai_rating) DESC
`).all();

ratingDist.forEach(r => {
  const bar = '█'.repeat(Math.round((r.count / stats.total) * 50));
  console.log(`${r.range.padEnd(20)} │ ${bar} ${r.count}`);
});

// ============================================================================
// 4️⃣ أسباب الفلترة
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n4️⃣ تحليل أسباب الفلترة:\n');

const filterAnalysis = db.prepare(`
  SELECT 
    filter_reason_valid,
    COUNT(*) as count,
    AVG(confidence_score) as avg_confidence
  FROM ai_content_analysis
  GROUP BY filter_reason_valid
`).all();

filterAnalysis.forEach(f => {
  const valid = f.filter_reason_valid ? 'صحيح' : 'خاطئ';
  console.log(`سبب الفلترة ${valid}: ${f.count} (ثقة: ${f.avg_confidence.toFixed(1)}%)`);
});

// ============================================================================
// 5️⃣ الأعمال المشهورة المفلترة بالخطأ
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n5️⃣ أعمال مشهورة مفلترة بالخطأ:\n');

const popularMistakes = db.prepare(`
  SELECT 
    a.*,
    CASE 
      WHEN a.content_type = 'movie' THEN m.title_en
      ELSE s.title_en
    END as title,
    CASE 
      WHEN a.content_type = 'movie' THEN m.release_year
      ELSE s.first_air_year
    END as year
  FROM ai_content_analysis a
  LEFT JOIN movies m ON a.content_type = 'movie' AND a.content_id = m.id
  LEFT JOIN tv_series s ON a.content_type = 'tv' AND a.content_id = s.id
  WHERE a.is_popular = 1
  AND a.should_be_filtered = 0
  ORDER BY a.popularity_score DESC
  LIMIT 10
`).all();

if (popularMistakes.length > 0) {
  popularMistakes.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title} (${item.year})`);
    console.log(`   Popularity Score: ${item.popularity_score}%`);
    console.log(`   ${item.filter_reason_analysis}`);
    console.log();
  });
} else {
  console.log('✅ لا توجد أعمال مشهورة مفلترة بالخطأ');
}

// ============================================================================
// 6️⃣ حفظ التقرير
// ============================================================================

console.log('='.repeat(80));
console.log('\n6️⃣ حفظ التقرير...\n');

const report = {
  generated_at: new Date().toISOString(),
  statistics: stats,
  to_unfilter: toUnfilter.map(item => ({
    title: item.title,
    year: item.year,
    type: item.content_type,
    ai_rating: item.ai_rating,
    imdb_rating: item.imdb_rating,
    imdb_votes: item.imdb_votes,
    recommendation: item.ai_recommendation,
    priority: item.unfilter_priority,
    summary: item.ai_summary
  })),
  rating_distribution: ratingDist,
  filter_analysis: filterAnalysis,
  popular_mistakes: popularMistakes.map(item => ({
    title: item.title,
    year: item.year,
    popularity_score: item.popularity_score,
    analysis: item.filter_reason_analysis
  }))
};

fs.writeFileSync('AI-ANALYSIS-REPORT.json', JSON.stringify(report, null, 2));
console.log('✅ تم حفظ: AI-ANALYSIS-REPORT.json');

// تقرير نصي
const textReport = `
# 📊 تقرير التحليل بالذكاء الاصطناعي

**التاريخ:** ${new Date().toLocaleString('ar-EG')}

## الإحصائيات العامة

- إجمالي التحليلات: ${stats.total}
- يستحق إلغاء الفلترة: ${stats.unfilter} (${((stats.unfilter/stats.total)*100).toFixed(1)}%)
- يبقى مفلتر: ${stats.keep_filtered} (${((stats.keep_filtered/stats.total)*100).toFixed(1)}%)
- يحتاج مراجعة: ${stats.needs_review} (${((stats.needs_review/stats.total)*100).toFixed(1)}%)

## الأعمال التي تستحق إلغاء الفلترة

${toUnfilter.length > 0 ? toUnfilter.map((item, i) => `
${i + 1}. **${item.title}** (${item.year})
   - AI Rating: ${item.ai_rating}/10
   - IMDb: ${item.imdb_rating || 'N/A'}/10 (${item.imdb_votes?.toLocaleString() || 0} votes)
   - Priority: ${item.unfilter_priority}
   - Summary: ${item.ai_summary}
`).join('\n') : 'لا توجد أعمال'}

## التوصيات

${stats.unfilter > 0 ? `
✅ وُجد ${stats.unfilter} عمل يستحق إلغاء الفلترة
💡 راجع القائمة أعلاه وقرر
🔧 استخدم: node scripts/apply-ai-recommendations.js
` : `
✅ الفلترة الحالية صحيحة
✅ لا يوجد محتوى مشهور مفلتر بالخطأ
`}
`;

fs.writeFileSync('AI-ANALYSIS-REPORT.md', textReport);
console.log('✅ تم حفظ: AI-ANALYSIS-REPORT.md');

// ============================================================================
// 7️⃣ الخطوة التالية
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n💡 الخطوة التالية:\n');

if (stats.unfilter > 0) {
  console.log(`✅ وُجد ${stats.unfilter} عمل يستحق إلغاء الفلترة`);
  console.log('\nالخيارات:');
  console.log('   1. راجع AI-ANALYSIS-REPORT.md');
  console.log('   2. إذا وافقت: node scripts/apply-ai-recommendations.js');
  console.log('   3. إذا تريد مراجعة يدوية: راجع الجدول ai_content_analysis');
} else {
  console.log('✅ الفلترة الحالية صحيحة');
  console.log('✅ لا يوجد محتوى يحتاج إلغاء فلترة');
  console.log('\n💡 يمكنك:');
  console.log('   - تحليل عينة أكبر');
  console.log('   - أو الثقة في الفلترة الحالية');
}

console.log('\n');
