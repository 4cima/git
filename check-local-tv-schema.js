const Database = require('better-sqlite3')
const db = new Database('./data/4cima-local.db')

console.log('📋 PRAGMA table_info(tv_series) في local.db:\n')

const schema = db.prepare('PRAGMA table_info(tv_series)').all()
schema.forEach(col => {
  console.log(`  [${col.cid}] ${col.name} (${col.type})`)
})

const checkColumns = ['backdrop_path', 'vote_count', 'popularity', 'keywords_json', 'networks_json', 'filter_status']

console.log('\n🔍 فحص الأعمدة المطلوبة:\n')
checkColumns.forEach(colName => {
  const exists = schema.some(col => col.name === colName)
  console.log(`   ${exists ? '✅' : '❌'} ${colName}`)
})

db.close()
