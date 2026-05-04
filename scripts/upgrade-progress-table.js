// ═══════════════════════════════════════════════════════════════════
// 🔧 تحسين جدول ingestion_progress
// ═══════════════════════════════════════════════════════════════════

require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')

console.log('🔧 بدء تحسين جدول ingestion_progress...\n')

try {
  // 1️⃣ نسخ البيانات القديمة
  console.log('📦 نسخ البيانات القديمة...')
  const oldData = db.prepare(`
    SELECT * FROM ingestion_progress
  `).all()
  
  console.log(`✅ تم نسخ ${oldData.length} سجل\n`)

  // 2️⃣ حذف الجدول القديم
  console.log('🗑️ حذف الجدول القديم...')
  db.prepare(`DROP TABLE IF EXISTS ingestion_progress`).run()
  console.log('✅ تم الحذف\n')

  // 3️⃣ إنشاء الجدول المحسّن
  console.log('🆕 إنشاء الجدول المحسّن...')
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ingestion_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      script_name TEXT NOT NULL,
      last_processed_id INTEGER DEFAULT 0,
      total_fetched INTEGER DEFAULT 0,
      total_errors INTEGER DEFAULT 0,
      total_filtered INTEGER DEFAULT 0,
      total_404 INTEGER DEFAULT 0,
      rate_per_minute REAL DEFAULT 0,
      estimated_completion DATETIME,
      last_run DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'idle',
      UNIQUE(script_name)
    )
  `).run()
  console.log('✅ تم إنشاء الجدول المحسّن\n')

  // 4️⃣ استعادة البيانات القديمة
  console.log('♻️ استعادة البيانات القديمة...')
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO ingestion_progress 
    (script_name, last_processed_id, total_fetched, total_errors, last_run, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  
  for (const row of oldData) {
    insertStmt.run(
      row.script_name,
      row.last_processed_id || 0,
      row.total_fetched || 0,
      row.total_errors || 0,
      row.last_run,
      row.status || 'idle'
    )
  }
  console.log(`✅ تم استعادة ${oldData.length} سجل\n`)

  // 5️⃣ إنشاء جدول الإحصائيات التاريخية
  console.log('📊 إنشاء جدول الإحصائيات التاريخية...')
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ingestion_stats_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      script_name TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      movies_processed INTEGER DEFAULT 0,
      series_processed INTEGER DEFAULT 0,
      seasons_processed INTEGER DEFAULT 0,
      episodes_processed INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      filtered INTEGER DEFAULT 0,
      rate_per_minute REAL DEFAULT 0,
      memory_usage_mb REAL DEFAULT 0
    )
  `).run()
  console.log('✅ تم إنشاء جدول الإحصائيات التاريخية\n')

  // 6️⃣ إنشاء indexes للأداء
  console.log('⚡ إنشاء indexes للأداء...')
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_progress_script 
    ON ingestion_progress(script_name)
  `).run()
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_history_script_time 
    ON ingestion_stats_history(script_name, timestamp DESC)
  `).run()
  console.log('✅ تم إنشاء الـ indexes\n')

  // 7️⃣ عرض البنية الجديدة
  console.log('═'.repeat(80))
  console.log('\n📋 البنية الجديدة لجدول ingestion_progress:\n')
  
  const schema = db.prepare(`
    PRAGMA table_info(ingestion_progress)
  `).all()
  
  schema.forEach(col => {
    console.log(`   ${col.name.padEnd(25)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''}`)
  })

  console.log('\n═'.repeat(80))
  console.log('\n✅ اكتمل تحسين الجدول بنجاح!\n')
  
  console.log('💡 الميزات الجديدة:')
  console.log('   ✅ last_processed_id - للاستئناف من آخر نقطة')
  console.log('   ✅ total_filtered - عدد المفلترة')
  console.log('   ✅ total_404 - عدد الـ 404')
  console.log('   ✅ rate_per_minute - السرعة')
  console.log('   ✅ estimated_completion - وقت الإنجاز المتوقع')
  console.log('   ✅ ingestion_stats_history - تاريخ الإحصائيات\n')

} catch (error) {
  console.error('❌ خطأ:', error.message)
  process.exit(1)
}
