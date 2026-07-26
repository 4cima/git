// فحص مصدر IDs في القاعدة المحلية
const Database = require('better-sqlite3')
const db = new Database('./data/4cima-local.db')

console.log('\n╔══════════════════════════════════════════════════════════════╗')
console.log('║           فحص مصدر TMDB IDs في القاعدة المحلية             ║')
console.log('╚══════════════════════════════════════════════════════════════╝\n')

// 1. عدد IDs الموجودة
console.log('📊 المرحلة 1: إحصائيات IDs\n')

const moviesCount = db.prepare('SELECT COUNT(*) as c FROM movies').get().c
const seriesCount = db.prepare('SELECT COUNT(*) as c FROM tv_series').get().c

console.log(`إجمالي IDs الأفلام: ${moviesCount.toLocaleString()}`)
console.log(`إجمالي IDs المسلسلات: ${seriesCount.toLocaleString()}`)
console.log(`إجمالي IDs: ${(moviesCount + seriesCount).toLocaleString()}`)

// 2. فحص عينة من IDs
console.log('\n📝 المرحلة 2: عينة من IDs الموجودة\n')

const sampleMovies = db.prepare(`
  SELECT id, tmdb_id, title_ar, title_en, release_year, vote_average, source, created_at
  FROM movies 
  ORDER BY id 
  LIMIT 10
`).all()

console.log('أول 10 أفلام:')
console.log('┌──────────┬──────────┬─────────────────────┬──────┬────────┬────────────┐')
console.log('│    ID    │ TMDB_ID  │       العنوان       │ سنة  │ تقييم  │   مصدر     │')
console.log('├──────────┼──────────┼─────────────────────┼──────┼────────┼────────────┤')

sampleMovies.forEach(m => {
  const title = (m.title_ar || m.title_en || 'N/A').substring(0, 19).padEnd(19)
  const id = String(m.id).padStart(8)
  const tmdb = String(m.tmdb_id || m.id).padStart(8)
  const year = String(m.release_year || 'N/A').padEnd(4)
  const rating = String(m.vote_average || 'N/A').padStart(6)
  const source = (m.source || 'N/A').padEnd(10)
  console.log(`│ ${id} │ ${tmdb} │ ${title} │ ${year} │ ${rating} │ ${source} │`)
})

console.log('└──────────┴──────────┴─────────────────────┴──────┴────────┴────────────┘')

// 3. فحص نطاقات IDs
console.log('\n📊 المرحلة 3: تحليل نطاقات IDs\n')

const movieRanges = db.prepare(`
  SELECT 
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(*) as total,
    COUNT(DISTINCT id) as unique_ids
  FROM movies
`).get()

console.log('نطاق IDs الأفلام:')
console.log(`  • أصغر ID: ${movieRanges.min_id.toLocaleString()}`)
console.log(`  • أكبر ID: ${movieRanges.max_id.toLocaleString()}`)
console.log(`  • إجمالي السجلات: ${movieRanges.total.toLocaleString()}`)
console.log(`  • IDs فريدة: ${movieRanges.unique_ids.toLocaleString()}`)
console.log(`  • نطاق IDs: ${movieRanges.min_id} - ${movieRanges.max_id}`)

// 4. فحص مصدر البيانات
console.log('\n🔍 المرحلة 4: فحص مصدر البيانات\n')

const sourceStats = db.prepare(`
  SELECT 
    source,
    COUNT(*) as count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
  FROM movies
  WHERE source IS NOT NULL
  GROUP BY source
  ORDER BY count DESC
`).all()

if (sourceStats.length > 0) {
  console.log('مصادر البيانات:')
  sourceStats.forEach(s => {
    console.log(`  • ${s.source}: ${s.count.toLocaleString()} فيلم`)
    console.log(`    ├─ أول إدخال: ${s.first_created || 'N/A'}`)
    console.log(`    └─ آخر إدخال: ${s.last_created || 'N/A'}`)
  })
} else {
  console.log('⚠️  عمود "source" فارغ أو غير موجود')
}

// 5. فحص fetched_from
const fetchedStats = db.prepare(`
  SELECT 
    fetched_from,
    COUNT(*) as count
  FROM movies
  WHERE fetched_from IS NOT NULL
  GROUP BY fetched_from
`).all()

if (fetchedStats.length > 0) {
  console.log('\nمصدر السحب (fetched_from):')
  fetchedStats.forEach(s => {
    console.log(`  • ${s.fetched_from}: ${s.count.toLocaleString()} فيلم`)
  })
} else {
  console.log('  لا توجد بيانات في عمود fetched_from')
}

// 6. فحص هل IDs من ملفات TMDB Export
console.log('\n📦 المرحلة 5: فحص هل IDs من ملفات TMDB Daily Export\n')

// تحقق من تواريخ الإنشاء
const createdDates = db.prepare(`
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as count
  FROM movies
  WHERE created_at IS NOT NULL
  GROUP BY DATE(created_at)
  ORDER BY count DESC
  LIMIT 5
`).all()

if (createdDates.length > 0) {
  console.log('أكثر تواريخ إنشاء IDs:')
  createdDates.forEach(d => {
    console.log(`  • ${d.date}: ${d.count.toLocaleString()} فيلم`)
  })
  
  if (createdDates[0].count > 100000) {
    console.log('\n✅ نعم! IDs تم إضافتها دفعة واحدة في نفس اليوم')
    console.log('   هذا يشير إلى أنها من ملفات TMDB Daily Export')
  }
} else {
  console.log('⚠️  لا توجد تواريخ إنشاء')
}

// 7. فحص البيانات المكتملة
console.log('\n📋 المرحلة 6: حالة البيانات\n')

const dataStatus = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN overview_ar IS NOT NULL THEN 1 ELSE 0 END) as with_overview,
    SUM(CASE WHEN title_ar IS NOT NULL AND title_ar != 'TBD' THEN 1 ELSE 0 END) as with_title,
    SUM(CASE WHEN poster_path IS NOT NULL THEN 1 ELSE 0 END) as with_poster,
    SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as complete,
    SUM(CASE WHEN is_fetched = 1 THEN 1 ELSE 0 END) as fetched
  FROM movies
`).get()

console.log('حالة البيانات:')
console.log(`  • إجمالي: ${dataStatus.total.toLocaleString()}`)
console.log(`  • به عنوان عربي: ${dataStatus.with_title.toLocaleString()} (${((dataStatus.with_title/dataStatus.total)*100).toFixed(1)}%)`)
console.log(`  • به وصف عربي: ${dataStatus.with_overview.toLocaleString()} (${((dataStatus.with_overview/dataStatus.total)*100).toFixed(1)}%)`)
console.log(`  • به بوستر: ${dataStatus.with_poster.toLocaleString()} (${((dataStatus.with_poster/dataStatus.total)*100).toFixed(1)}%)`)
console.log(`  • مكتمل: ${dataStatus.complete.toLocaleString()} (${((dataStatus.complete/dataStatus.total)*100).toFixed(1)}%)`)
console.log(`  • تم سحبه: ${dataStatus.fetched.toLocaleString()} (${((dataStatus.fetched/dataStatus.total)*100).toFixed(1)}%)`)

// 8. الخلاصة
console.log('\n╔══════════════════════════════════════════════════════════════╗')
console.log('║                          الخلاصة                             ║')
console.log('╚══════════════════════════════════════════════════════════════╝\n')

if (dataStatus.with_overview === dataStatus.total) {
  console.log('✅ IDs موجودة والبيانات مكتملة!')
  console.log('   المصدر: على الأرجح تم تنزيلها من Turso (باستخدام download-from-turso.js)')
  console.log('   الحالة: جاهزة للعمل بدون حاجة لسحب من TMDB')
} else if (dataStatus.with_overview > 0) {
  console.log('⚠️  IDs موجودة لكن البيانات غير مكتملة')
  console.log(`   ${dataStatus.with_overview.toLocaleString()} فيلم به بيانات`)
  console.log(`   ${(dataStatus.total - dataStatus.with_overview).toLocaleString()} فيلم يحتاج سحب`)
  console.log('   التوصية: تشغيل سكريبت السحب لملء البيانات الناقصة')
} else {
  console.log('⚠️  IDs موجودة لكن بدون بيانات (IDs فقط)')
  console.log('   المصدر المحتمل: ملفات TMDB Daily Export أو Turso')
  console.log('   التوصية: تشغيل سكريبت السحب لملء كل البيانات')
}

console.log('\n💡 ملاحظة:')
console.log('   ملفات TMDB Daily Export متوفرة على:')
console.log('   https://developers.themoviedb.org/3/getting-started/daily-file-exports')
console.log('   - movie_ids_{date}.json.gz')
console.log('   - tv_series_ids_{date}.json.gz')

console.log('\n')
db.close()
