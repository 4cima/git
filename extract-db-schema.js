const Database = require('better-sqlite3')
const fs = require('fs')
const db = new Database('./data/4cima-local.db')

let output = '='.repeat(80) + '\n'
output += '   بنية قاعدة البيانات المحلية - movies table\n'
output += '='.repeat(80) + '\n\n'

// Schema
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='movies'").get()
output += '📋 CREATE TABLE Statement:\n\n'
output += schema.sql + '\n\n'

// Columns
output += '='.repeat(80) + '\n'
output += '📊 أعمدة جدول movies:\n'
output += '='.repeat(80) + '\n\n'

const columns = db.prepare('PRAGMA table_info(movies)').all()
columns.forEach((col, i) => {
  output += `${i + 1}. ${col.name}\n`
  output += `   - النوع: ${col.type}\n`
  output += `   - NOT NULL: ${col.notnull === 1 ? 'نعم' : 'لا'}\n`
  output += `   - Default: ${col.dflt_value || 'N/A'}\n`
  output += `   - Primary Key: ${col.pk === 1 ? 'نعم' : 'لا'}\n\n`
})

fs.writeFileSync('DB-STRUCTURE.txt', output, 'utf8')
console.log('✅ تم حفظ البنية في DB-STRUCTURE.txt')

db.close()
