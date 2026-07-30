const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, '..', 'data', '4cima-local.db'), { 
  readonly: true 
})

console.log('\n=== فحص keywords و companies في local.db ===\n')

// 1. فحص الجداول الموجودة
console.log('1. الجداول الموجودة المتعلقة بـ keywords و companies:\n')
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND (
    name LIKE '%keyword%' OR 
    name LIKE '%company%' OR 
    name LIKE '%compan%' OR
    name LIKE '%production%'
  )
`).all()

if (tables.length === 0) {
  console.log('   ❌ لا توجد جداول مخصصة لـ keywords أو companies')
} else {
  tables.forEach(t => console.log(`   - ${t.name}`))
}

// 2. فحص أعمدة في جدول movies
console.log('\n2. أعمدة متعلقة بـ keywords/companies في جدول movies:\n')
const movieColumns = db.prepare(`PRAGMA table_info(movies)`).all()
const relevantCols = movieColumns.filter(c => 
  c.name.includes('keyword') || 
  c.name.includes('company') || 
  c.name.includes('compan') ||
  c.name.includes('production')
)

if (relevantCols.length === 0) {
  console.log('   ❌ لا توجد أعمدة مخصصة لـ keywords أو companies في movies')
} else {
  relevantCols.forEach(c => console.log(`   - ${c.name} (${c.type})`))
}

// 3. عينة من بيانات فيلم واحد (نشوف لو فيه أي حاجة)
console.log('\n3. عينة من فيلم واحد (tmdb_id = 550) - التحقق من وجود بيانات:\n')
const sampleMovie = db.prepare(`
  SELECT * FROM movies WHERE tmdb_id = 550 LIMIT 1
`).get()

if (sampleMovie) {
  const cols = Object.keys(sampleMovie)
  const relevantData = cols.filter(c => 
    c.includes('keyword') || 
    c.includes('company') || 
    c.includes('compan') ||
    c.includes('production')
  )
  
  if (relevantData.length === 0) {
    console.log('   ❌ لا توجد أعمدة متعلقة بـ keywords/companies')
  } else {
    relevantData.forEach(col => {
      console.log(`   - ${col}: ${sampleMovie[col] || 'NULL'}`)
    })
  }
} else {
  console.log('   ⚠️ الفيلم tmdb_id=550 غير موجود')
}

// 4. لو فيه جداول منفصلة، نعد كم صف فيها
if (tables.length > 0) {
  console.log('\n4. عدد الصفوف في الجداول المكتشفة:\n')
  tables.forEach(t => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${t.name}`).get()
      console.log(`   - ${t.name}: ${count.cnt} صف`)
      
      // عينة من أول صف
      const sample = db.prepare(`SELECT * FROM ${t.name} LIMIT 1`).get()
      if (sample) {
        console.log(`     عينة: ${JSON.stringify(sample).substring(0, 100)}...`)
      }
    } catch (e) {
      console.log(`   - ${t.name}: خطأ في القراءة - ${e.message}`)
    }
  })
}

console.log('\n=== الخلاصة ===\n')
if (tables.length === 0 && relevantCols.length === 0) {
  console.log('❌ لا توجد بيانات keywords أو companies في local.db أصلاً')
  console.log('   → السبب: 1-fetch-and-enrich.js لا يسحب هذه البيانات من TMDB')
  console.log('   → الحل: ليس هناك خلل في 3-sync-to-turso.js')
} else {
  console.log('✅ توجد بيانات keywords/companies في local.db')
  console.log('   → السبب: 3-sync-to-turso.js لا ينقلها إلى Turso')
  console.log('   → الحل: يجب تحديث سكريبت المزامنة')
}

db.close()
console.log()
