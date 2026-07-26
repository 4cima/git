#!/usr/bin/env node
/**
 * 🤖 إنشاء جداول التحليل بالذكاء الاصطناعي
 * ينشئ الجداول اللازمة لتخزين تحليلات Grok
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', '4cima-local.db');
const db = new Database(DB_PATH);

console.log('🤖 إنشاء جداول التحليل بالذكاء الاصطناعي\n');
console.log('='.repeat(80));

try {
  db.prepare('BEGIN TRANSACTION').run();
  
  // ============================================================================
  // 1️⃣ جدول التحليل الرئيسي
  // ============================================================================
  
  console.log('\n1️⃣ إنشاء جدول ai_content_analysis...');
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_content_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('movie', 'tv')),
      
      -- معلومات التحليل
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ai_provider TEXT DEFAULT 'grok',
      analysis_version TEXT DEFAULT '1.0',
      
      -- التقييم العام
      ai_rating REAL CHECK(ai_rating >= 0 AND ai_rating <= 10),
      ai_recommendation TEXT CHECK(ai_recommendation IN ('unfilter', 'keep_filtered', 'needs_review')),
      confidence_score REAL CHECK(confidence_score >= 0 AND confidence_score <= 100),
      
      -- التحليل التفصيلي
      is_popular INTEGER DEFAULT 0,
      popularity_score REAL CHECK(popularity_score >= 0 AND popularity_score <= 100),
      is_high_quality INTEGER DEFAULT 0,
      quality_score REAL CHECK(quality_score >= 0 AND quality_score <= 100),
      is_worth_watching INTEGER DEFAULT 0,
      worth_watching_score REAL CHECK(worth_watching_score >= 0 AND worth_watching_score <= 100),
      
      -- البيانات الخارجية
      imdb_rating REAL,
      imdb_votes INTEGER,
      rotten_tomatoes_rating INTEGER,
      metacritic_rating INTEGER,
      
      -- التصنيفات
      genre_accuracy TEXT,
      target_audience TEXT,
      content_quality TEXT,
      production_value TEXT,
      
      -- أسباب الفلترة
      filter_reason_valid INTEGER DEFAULT 0,
      filter_reason_analysis TEXT,
      should_be_filtered INTEGER DEFAULT 0,
      unfilter_priority INTEGER CHECK(unfilter_priority >= 1 AND unfilter_priority <= 5),
      
      -- التحليل النصي
      ai_summary TEXT,
      ai_pros TEXT,
      ai_cons TEXT,
      ai_notes TEXT,
      
      -- البحث والمصادر
      search_results TEXT,
      sources_checked TEXT,
      
      -- الحالة
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'analyzed', 'reviewed', 'actioned')),
      reviewed_by_human INTEGER DEFAULT 0,
      human_decision TEXT,
      human_notes TEXT,
      
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(content_id, content_type)
    )
  `).run();
  
  console.log('   ✅ تم إنشاء جدول ai_content_analysis');
  
  // الفهارس
  console.log('   📑 إنشاء الفهارس...');
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_ai_analysis_content 
    ON ai_content_analysis(content_id, content_type)
  `).run();
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_ai_analysis_recommendation 
    ON ai_content_analysis(ai_recommendation)
  `).run();
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_ai_analysis_status 
    ON ai_content_analysis(status)
  `).run();
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_ai_analysis_priority 
    ON ai_content_analysis(unfilter_priority)
  `).run();
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_ai_analysis_date 
    ON ai_content_analysis(analyzed_at)
  `).run();
  
  console.log('   ✅ تم إنشاء الفهارس');
  
  // ============================================================================
  // 2️⃣ جدول التفاصيل
  // ============================================================================
  
  console.log('\n2️⃣ إنشاء جدول ai_analysis_details...');
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_analysis_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL,
      
      criterion_name TEXT NOT NULL,
      criterion_score REAL CHECK(criterion_score >= 0 AND criterion_score <= 10),
      criterion_notes TEXT,
      weight REAL DEFAULT 1.0,
      
      FOREIGN KEY (analysis_id) REFERENCES ai_content_analysis(id) ON DELETE CASCADE
    )
  `).run();
  
  console.log('   ✅ تم إنشاء جدول ai_analysis_details');
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_analysis_details 
    ON ai_analysis_details(analysis_id)
  `).run();
  
  console.log('   ✅ تم إنشاء الفهرس');
  
  // ============================================================================
  // 3️⃣ جدول السجل
  // ============================================================================
  
  console.log('\n3️⃣ إنشاء جدول ai_analysis_log...');
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_analysis_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      
      attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      attempt_number INTEGER DEFAULT 1,
      
      success INTEGER DEFAULT 0,
      error_message TEXT,
      
      request_data TEXT,
      response_data TEXT,
      processing_time_ms INTEGER,
      
      api_cost_usd REAL
    )
  `).run();
  
  console.log('   ✅ تم إنشاء جدول ai_analysis_log');
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_analysis_log_content 
    ON ai_analysis_log(content_id, content_type)
  `).run();
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_analysis_log_date 
    ON ai_analysis_log(attempt_at)
  `).run();
  
  console.log('   ✅ تم إنشاء الفهارس');
  
  // ============================================================================
  // 4️⃣ Commit
  // ============================================================================
  
  db.prepare('COMMIT').run();
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ تم إنشاء جميع الجداول بنجاح!\n');
  
  // ============================================================================
  // 5️⃣ التحقق
  // ============================================================================
  
  console.log('📊 التحقق من الجداول:\n');
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name LIKE 'ai_%'
    ORDER BY name
  `).all();
  
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`   ✅ ${table.name}: ${count.count} سجل`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 الخطوة التالية:');
  console.log('   node scripts/analyze-sample-100.js');
  console.log('\n');
  
} catch (error) {
  db.prepare('ROLLBACK').run();
  console.error('\n❌ خطأ:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
