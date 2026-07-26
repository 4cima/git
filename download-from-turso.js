// تنزيل قاعدة البيانات من Turso إلى ملف SQLite محلي
require('dotenv').config({ path: '.env.local' })
const Database = require('better-sqlite3')
const { createClient } = require('@libsql/client')
const fs = require('fs')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function downloadDatabase() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║         📥 تنزيل قاعدة البيانات من Turso                  ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  // إنشاء مجلد data
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data')
    console.log('✓ تم إنشاء مجلد ./data\n')
  }

  // إنشاء قاعدة بيانات محلية جديدة
  const localDb = new Database('./data/4cima-local.db')
  console.log('✓ تم إنشاء ملف: ./data/4cima-local.db\n')

  try {
    // 1. الحصول على بنية الجداول
    console.log('📋 المرحلة 1: نسخ بنية الجداول...\n')
    
    const tablesResult = await turso.execute({
      sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      args: []
    })

    for (const table of tablesResult.rows) {
      if (table.sql) {
        localDb.exec(table.sql)
        console.log(`  ✓ ${table.sql.match(/CREATE TABLE (\w+)/)?.[1] || 'table'}`)
      }
    }

    // 2. نسخ البيانات
    console.log('\n📦 المرحلة 2: نسخ البيانات...\n')

    const tables = [
      { name: 'genres', batchSize: 100 },
      { name: 'countries', batchSize: 100 },
      { name: 'languages', batchSize: 100 },
      { name: 'global_keywords', batchSize: 100 },
      { name: 'movies', batchSize: 500 },
      { name: 'tv_series', batchSize: 500 }
    ]

    for (const tableInfo of tables) {
      const { name, batchSize } = tableInfo
      
      console.log(`\n  📊 ${name}...`)
      
      // الحصول على عدد الصفوف
      const countResult = await turso.execute({
        sql: `SELECT COUNT(*) as cnt FROM ${name}`,
        args: []
      })
      const totalRows = countResult.rows[0].cnt
      
      if (totalRows === 0) {
        console.log(`     فارغ - تم التخطي`)
        continue
      }

      // الحصول على أسماء الأعمدة
      const columnsResult = await turso.execute({
        sql: `PRAGMA table_info(${name})`,
        args: []
      })
      const columns = columnsResult.rows.map(c => c.name)
      const columnsList = columns.join(', ')
      const placeholders = columns.map(() => '?').join(', ')

      // إعداد statement للإدراج
      const insertStmt = localDb.prepare(
        `INSERT INTO ${name} (${columnsList}) VALUES (${placeholders})`
      )

      // نسخ البيانات على دفعات
      let offset = 0
      let totalCopied = 0

      while (offset < totalRows) {
        const dataResult = await turso.execute({
          sql: `SELECT * FROM ${name} LIMIT ${batchSize} OFFSET ${offset}`,
          args: []
        })

        // إدراج الدفعة
        const insertMany = localDb.transaction((rows) => {
          for (const row of rows) {
            const values = columns.map(col => row[col])
            insertStmt.run(...values)
          }
        })

        insertMany(dataResult.rows)
        
        totalCopied += dataResult.rows.length
        offset += batchSize

        const progress = ((totalCopied / totalRows) * 100).toFixed(1)
        process.stdout.write(`\r     ${totalCopied.toLocaleString()} / ${totalRows.toLocaleString()} (${progress}%)`)
      }

      console.log(` ✓`)
    }

    console.log('\n\n✅ تم تنزيل قاعدة البيانات بنجاح!')
    console.log('\n📊 الإحصائيات:\n')

    // عرض الإحصائيات
    const stats = [
      'movies',
      'tv_series',
      'genres',
      'countries',
      'languages',
      'global_keywords'
    ]

    for (const table of stats) {
      try {
        const count = localDb.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get().cnt
        console.log(`  ${table.padEnd(20)} ${String(count).padStart(10)} صف`)
      } catch (e) {
        // Table might not exist
      }
    }

    // حجم الملف
    const fileStats = fs.statSync('./data/4cima-local.db')
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2)
    console.log(`\n  حجم الملف: ${fileSizeMB} MB`)

    console.log('\n📁 الموقع: ./data/4cima-local.db')
    console.log('✓ جاهز للاستخدام!\n')

  } catch (error) {
    console.error('\n❌ خطأ:', error.message)
    throw error
  } finally {
    localDb.close()
  }
}

downloadDatabase().catch(err => {
  console.error('فشل التنزيل:', err)
  process.exit(1)
})
