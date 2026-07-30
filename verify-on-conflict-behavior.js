/**
 * التحقق من سلوك ON CONFLICT
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')

async function main() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })

  console.log('═'.repeat(80))
  console.log('🔍 فحص سلوك ON CONFLICT')
  console.log('═'.repeat(80))
  console.log('')

  // فحص الـ 99 الموجودين
  console.log('📊 الـ 99 مسلسل الموجودين في Turso:')
  const existing = await turso.execute(`
    SELECT id, tmdb_id, name_en, created_at, updated_at
    FROM tv_series
    ORDER BY id
    LIMIT 10
  `)
  
  console.log('أول 10 صفوف:')
  existing.rows.forEach(r => {
    console.log(`  id=${r.id}, tmdb_id=${r.tmdb_id}, name=${r.name_en}`)
  })
  console.log('')

  // فحص الـ 50 اللي من المفروض اتزامنوا
  console.log('🔍 فحص الـ 50 مسلسل اللي من المفروض اتزامنوا:')
  const Database = require('better-sqlite3')
  const path = require('path')
  const localDb = new Database(path.join(__dirname, 'data', '4cima-local.db'), { readonly: true })
  
  const recent = localDb.prepare(`
    SELECT tmdb_id, name_en, synced_to_turso, synced_at
    FROM tv_series
    WHERE synced_to_turso = 1
      AND synced_at IS NOT NULL
    ORDER BY synced_at DESC
    LIMIT 10
  `).all()
  
  console.log('آخر 10 صفوف تم تحديث synced_to_turso لها:')
  recent.forEach(r => {
    console.log(`  tmdb_id=${r.tmdb_id}, name=${r.name_en}, synced_at=${r.synced_at}`)
  })
  console.log('')

  // فحص إذا كانوا موجودين في Turso
  console.log('🔍 هل الـ 50 موجودين في Turso؟')
  const recentIds = localDb.prepare(`
    SELECT tmdb_id FROM tv_series
    WHERE synced_to_turso = 1 AND synced_at IS NOT NULL
    ORDER BY synced_at DESC
    LIMIT 5
  `).all().map(r => r.tmdb_id)
  
  for (const tmdb_id of recentIds) {
    const check = await turso.execute({
      sql: 'SELECT COUNT(*) as c FROM tv_series WHERE tmdb_id = ?',
      args: [tmdb_id]
    })
    const exists = check.rows[0].c > 0
    console.log(`  tmdb_id ${tmdb_id}: ${exists ? '✅ موجود' : '❌ غير موجود'}`)
  }
  console.log('')

  // فحص schema
  console.log('📋 فحص schema:')
  const schema = await turso.execute(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='tv_series'
  `)
  console.log(schema.rows[0].sql)
  console.log('')

  localDb.close()
}

main().catch(console.error)
