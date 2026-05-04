// ============================================
// 🔧 إضافة أعمدة is_fetched و fetched_at و fetched_from
// ============================================
require('dotenv').config({ path: './.env.local' })
const Database = require('better-sqlite3')

const db = new Database('./data/4cima-local.db')

console.log('🔧 إضافة الأعمدة الناقصة\n')
console.log('═'.repeat(80))

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1️⃣ إضافة الأعمدة للأفلام
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎬 إضافة الأعمدة للأفلام:')
console.log('─'.repeat(80))

try {
  db.exec(`ALTER TABLE movies ADD COLUMN is_fetched INTEGER DEFAULT 0`)
  console.log('✅ تم إضافة عمود is_fetched')
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('⚠️ عمود is_fetched موجود بالفعل')
  } else {
    console.error('❌ خطأ:', e.message)
  }
}

try {
  db.exec(`ALTER TABLE movies ADD COLUMN fetched_at DATETIME`)
  console.log('✅ تم إضافة عمود fetched_at')
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('⚠️ عمود fetched_at موجود بالفعل')
  } else {
    console.error('❌ خطأ:', e.message)
  }
}

try {
  db.exec(`ALTER TABLE movies ADD COLUMN fetched_from TEXT`)
  console.log('✅ تم إضافة عمود fetched_from')
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('⚠️ عمود fetched_from موجود بالفعل')
  } else {
    console.error('❌ خطأ:', e.message)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2️⃣ إضافة الأعمدة للمسلسلات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📺 إضافة الأعمدة للمسلسلات:')
console.log('─'.repeat(80))

try {
  db.exec(`ALTER TABLE tv_series ADD COLUMN is_fetched INTEGER DEFAULT 0`)
  console.log('✅ تم إضافة عمود is_fetched')
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('⚠️ عمود is_fetched موجود بالفعل')
  } else {
    console.error('❌ خطأ:', e.message)
  }
}

try {
  db.exec(`ALTER TABLE tv_series ADD COLUMN fetched_at DATETIME`)
  console.log('✅ تم إضافة عمود fetched_at')
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('⚠️ عمود fetched_at موجود بالفعل')
  } else {
    console.error('❌ خطأ:', e.message)
  }
}

try {
  db.exec(`ALTER TABLE tv_series ADD COLUMN fetched_from TEXT`)
  console.log('✅ تم إضافة عمود fetched_from')
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('⚠️ عمود fetched_from موجود بالفعل')
  } else {
    console.error('❌ خطأ:', e.message)
  }
}

console.log('\n' + '═'.repeat(80))
console.log('✅ اكتملت إضافة الأعمدة!\n')

db.close()
