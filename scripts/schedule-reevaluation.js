// schedule-reevaluation.js
// جدولة إعادة تقييم الأعمال المفلترة بشكل دوري

const db = require('./services/local-db');

console.log('📅 نظام جدولة إعادة التقييم\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// ============================================================
// إضافة حقل last_reevaluated_at
// ============================================================
console.log('🔧 إعداد قاعدة البيانات:\n');

try {
  // إضافة عمود للأفلام
  db.exec(`
    ALTER TABLE movies 
    ADD COLUMN last_reevaluated_at INTEGER DEFAULT NULL
  `);
  console.log('  ✅ تم إضافة last_reevaluated_at للأفلام');
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('  ℹ️ last_reevaluated_at موجود بالفعل للأفلام');
  } else {
    console.error('  ❌ خطأ:', e.message);
  }
}

try {
  // إضافة عمود للمسلسلات
  db.exec(`
    ALTER TABLE tv_series 
    ADD COLUMN last_reevaluated_at INTEGER DEFAULT NULL
  `);
  console.log('  ✅ تم إضافة last_reevaluated_at للمسلسلات\n');
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('  ℹ️ last_reevaluated_at موجود بالفعل للمسلسلات\n');
  } else {
    console.error('  ❌ خطأ:', e.message);
  }
}

// ============================================================
// استراتيجية إعادة التقييم
// ============================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 استراتيجية إعادة التقييم:\n');

const REEVALUATION_STRATEGY = {
  // الأعمال التي لم يُعاد تقييمها أبداً - أولوية عالية
  never_reevaluated: {
    priority: 1,
    interval_days: 0,
    description: 'لم يُعاد تقييمها أبداً'
  },
  
  // الأعمال الحديثة (آخر سنتين) - إعادة تقييم كل 30 يوم
  recent: {
    priority: 2,
    interval_days: 30,
    description: 'أعمال حديثة (2024+)'
  },
  
  // الأعمال المتوسطة (2020-2023) - إعادة تقييم كل 90 يوم
  medium: {
    priority: 3,
    interval_days: 90,
    description: 'أعمال متوسطة (2020-2023)'
  },
  
  // الأعمال القديمة (قبل 2020) - إعادة تقييم كل 180 يوم
  old: {
    priority: 4,
    interval_days: 180,
    description: 'أعمال قديمة (قبل 2020)'
  }
};

Object.entries(REEVALUATION_STRATEGY).forEach(([key, strategy]) => {
  console.log(`${strategy.priority}. ${strategy.description}`);
  console.log(`   الفترة: ${strategy.interval_days === 0 ? 'فوري' : `كل ${strategy.interval_days} يوم`}\n`);
});

// ============================================================
// تحليل الأعمال المحتاجة لإعادة تقييم
// ============================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 تحليل الأعمال المحتاجة لإعادة تقييم:\n');

const PERMANENT_FILTER_REASONS = [
  'adult_flag',
  'hard_explicit:porn',
  'hard_explicit:porno',
  'hard_explicit:pornography',
  'hard_explicit:xxx',
  'hard_explicit:hentai',
  'hard_explicit:erotic',
  'hard_explicit:hardcore',
  'hard_explicit:softcore',
  'hard_explicit:adult film',
  'hard_explicit:sex tape'
];

const now = Math.floor(Date.now() / 1000);
const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
const ninetyDaysAgo = now - (90 * 24 * 60 * 60);
const oneEightyDaysAgo = now - (180 * 24 * 60 * 60);

// الأفلام
const moviesAnalysis = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN last_reevaluated_at IS NULL THEN 1 END) as never_reevaluated,
    COUNT(CASE WHEN 
      last_reevaluated_at IS NOT NULL 
      AND release_year >= 2024 
      AND last_reevaluated_at < ?
    THEN 1 END) as recent_due,
    COUNT(CASE WHEN 
      last_reevaluated_at IS NOT NULL 
      AND release_year >= 2020 AND release_year < 2024
      AND last_reevaluated_at < ?
    THEN 1 END) as medium_due,
    COUNT(CASE WHEN 
      last_reevaluated_at IS NOT NULL 
      AND release_year < 2020
      AND last_reevaluated_at < ?
    THEN 1 END) as old_due
  FROM movies
  WHERE is_filtered = 1
    AND filter_reason NOT IN (${PERMANENT_FILTER_REASONS.map(() => '?').join(',')})
`).get(thirtyDaysAgo, ninetyDaysAgo, oneEightyDaysAgo, ...PERMANENT_FILTER_REASONS);

console.log('🎬 الأفلام:');
console.log(`  إجمالي قابل لإعادة التقييم: ${moviesAnalysis.total.toLocaleString()}`);
console.log(`  🔴 لم يُعاد تقييمها أبداً: ${moviesAnalysis.never_reevaluated.toLocaleString()}`);
console.log(`  🟡 حديثة (30+ يوم): ${moviesAnalysis.recent_due.toLocaleString()}`);
console.log(`  🟢 متوسطة (90+ يوم): ${moviesAnalysis.medium_due.toLocaleString()}`);
console.log(`  🔵 قديمة (180+ يوم): ${moviesAnalysis.old_due.toLocaleString()}\n`);

// المسلسلات
const seriesAnalysis = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN last_reevaluated_at IS NULL THEN 1 END) as never_reevaluated,
    COUNT(CASE WHEN 
      last_reevaluated_at IS NOT NULL 
      AND first_air_year >= 2024 
      AND last_reevaluated_at < ?
    THEN 1 END) as recent_due,
    COUNT(CASE WHEN 
      last_reevaluated_at IS NOT NULL 
      AND first_air_year >= 2020 AND first_air_year < 2024
      AND last_reevaluated_at < ?
    THEN 1 END) as medium_due,
    COUNT(CASE WHEN 
      last_reevaluated_at IS NOT NULL 
      AND first_air_year < 2020
      AND last_reevaluated_at < ?
    THEN 1 END) as old_due
  FROM tv_series
  WHERE is_filtered = 1
    AND filter_reason NOT IN (${PERMANENT_FILTER_REASONS.map(() => '?').join(',')})
`).get(thirtyDaysAgo, ninetyDaysAgo, oneEightyDaysAgo, ...PERMANENT_FILTER_REASONS);

console.log('📺 المسلسلات:');
console.log(`  إجمالي قابل لإعادة التقييم: ${seriesAnalysis.total.toLocaleString()}`);
console.log(`  🔴 لم يُعاد تقييمها أبداً: ${seriesAnalysis.never_reevaluated.toLocaleString()}`);
console.log(`  🟡 حديثة (30+ يوم): ${seriesAnalysis.recent_due.toLocaleString()}`);
console.log(`  🟢 متوسطة (90+ يوم): ${seriesAnalysis.medium_due.toLocaleString()}`);
console.log(`  🔵 قديمة (180+ يوم): ${seriesAnalysis.old_due.toLocaleString()}\n`);

// ============================================================
// التوصيات
// ============================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('💡 التوصيات:\n');

const totalDue = 
  moviesAnalysis.never_reevaluated + moviesAnalysis.recent_due + moviesAnalysis.medium_due + moviesAnalysis.old_due +
  seriesAnalysis.never_reevaluated + seriesAnalysis.recent_due + seriesAnalysis.medium_due + seriesAnalysis.old_due;

console.log(`📊 إجمالي الأعمال المحتاجة لإعادة تقييم: ${totalDue.toLocaleString()}\n`);

console.log('🎯 خطة التنفيذ:');
console.log('  1. شغّل: node scripts/auto-unfilter-smart.js');
console.log('  2. جدولة تلقائية: كل 30 يوم');
console.log('  3. أو استخدم cron job:\n');
console.log('     # كل 30 يوم في الساعة 2 صباحاً');
console.log('     0 2 1 * * node scripts/auto-unfilter-smart.js\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('✅ اكتمل التحليل!\n');

db.close();
