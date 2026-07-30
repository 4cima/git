const Database = require('better-sqlite3')
const db = new Database('data/4cima-local.db', { readonly: true })

const noSlug = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE is_complete = 1 
    AND filter_status IN ('clean', 'reviewed_approved') 
    AND synced_to_turso = 0 
    AND (slug IS NULL OR slug = '')
`).get()

const withSlug = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE is_complete = 1 
    AND filter_status IN ('clean', 'reviewed_approved') 
    AND synced_to_turso = 0 
    AND slug IS NOT NULL 
    AND slug != ''
`).get()

const total = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE is_complete = 1 
    AND filter_status IN ('clean', 'reviewed_approved') 
    AND synced_to_turso = 0
`).get()

console.log('═'.repeat(60))
console.log('تحليل مشكلة slug')
console.log('═'.repeat(60))
console.log('')
console.log(`إجمالي المتبقية: ${total.c.toLocaleString('en-US')}`)
console.log(`مع slug صحيح: ${withSlug.c.toLocaleString('en-US')} (${((withSlug.c/total.c)*100).toFixed(2)}%)`)
console.log(`بدون slug: ${noSlug.c.toLocaleString('en-US')} (${((noSlug.c/total.c)*100).toFixed(2)}%)`)
console.log('')

db.close()
