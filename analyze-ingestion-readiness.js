// تحليل جاهزية قاعدة البيانات المحلية لاستقبال بيانات السحب
const Database = require('better-sqlite3')
const db = new Database('./data/4cima-local.db')

console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║     تحليل جاهزية قاعدة البيانات لسكريبتات السحب          ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

// 1. فحص الجداول المطلوبة
console.log('📋 المرحلة 1: فحص الجداول المطلوبة\n')

const requiredTables = [
  'movies',
  'tv_series', 
  'people',
  'cast_crew',
  'content_genres',
  'genres',
  'translation_cache',
  'ingestion_progress'
]

const existingTables = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table'
`).all().map(t => t.name)

console.log('الجداول المطلوبة:')
let missingTables = []
for (const table of requiredTables) {
  if (existingTables.includes(table)) {
    console.log(`  ✓ ${table}`)
  } else {
    console.log(`  ✗ ${table} - ناقص!`)
    missingTables.push(table)
  }
}

// 2. فحص الأعمدة في جدول movies
console.log('\n📋 المرحلة 2: فحص أعمدة جدول movies\n')

const requiredMoviesColumns = [
  'id', 'tmdb_id', 'slug', 'title_ar', 'title_en', 'title_original',
  'overview_ar', 'overview_en',
  'primary_genre', 'keywords',
  'poster_path', 'backdrop_path', 'trailer_key', 'imdb_id',
  'release_date', 'release_year', 'runtime',
  'original_language', 'country_of_origin', 'production_companies',
  'vote_average', 'vote_count', 'popularity',
  'has_arabic_title', 'has_arabic_overview', 'has_trailer', 
  'has_keywords', 'has_genres', 'has_cast',
  'is_complete', 'is_filtered', 'filter_reason',
  'sync_priority', 'synced_to_turso',
  'seo_keywords_json', 'seo_title_ar', 'seo_title_en', 
  'seo_description_ar', 'canonical_url',
  'created_at', 'updated_at'
]

const moviesColumns = db.prepare(`PRAGMA table_info(movies)`).all().map(c => c.name)

console.log('الأعمدة المطلوبة في movies:')
let missingMoviesColumns = []
for (const col of requiredMoviesColumns) {
  if (moviesColumns.includes(col)) {
    console.log(`  ✓ ${col}`)
  } else {
    console.log(`  ✗ ${col} - ناقص!`)
    missingMoviesColumns.push(col)
  }
}

// 3. فحص جدول people (الممثلين)
console.log('\n📋 المرحلة 3: فحص جدول people\n')

if (existingTables.includes('people')) {
  const peopleColumns = db.prepare(`PRAGMA table_info(people)`).all().map(c => c.name)
  const requiredPeopleColumns = [
    'id', 'tmdb_id', 'slug', 'name_ar', 'name_en',
    'biography_ar', 'biography_en', 
    'profile_path', 'gender', 'known_for_department',
    'birthday', 'place_of_birth', 'popularity', 'is_active'
  ]
  
  console.log('الأعمدة المطلوبة في people:')
  let missingPeopleColumns = []
  for (const col of requiredPeopleColumns) {
    if (peopleColumns.includes(col)) {
      console.log(`  ✓ ${col}`)
    } else {
      console.log(`  ✗ ${col} - ناقص!`)
      missingPeopleColumns.push(col)
    }
  }
} else {
  console.log('✗ جدول people غير موجود!')
}

// 4. فحص جدول cast_crew
console.log('\n📋 المرحلة 4: فحص جدول cast_crew\n')

if (existingTables.includes('cast_crew')) {
  const castColumns = db.prepare(`PRAGMA table_info(cast_crew)`).all().map(c => c.name)
  const requiredCastColumns = [
    'id', 'content_id', 'content_type', 'person_id', 'role_type',
    'character_name', 'cast_order', 'job', 'department'
  ]
  
  console.log('الأعمدة المطلوبة في cast_crew:')
  for (const col of requiredCastColumns) {
    if (castColumns.includes(col)) {
      console.log(`  ✓ ${col}`)
    } else {
      console.log(`  ✗ ${col} - ناقص!`)
    }
  }
} else {
  console.log('✗ جدول cast_crew غير موجود!')
}

// 5. فحص البيانات الحالية
console.log('\n📊 المرحلة 5: فحص البيانات الموجودة\n')

const stats = {
  totalMovies: db.prepare('SELECT COUNT(*) as c FROM movies').get().c,
  moviesWithOverview: db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL').get().c,
  moviesComplete: db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 1').get().c,
  moviesFiltered: db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1').get().c,
  moviesPending: db.prepare(`
    SELECT COUNT(*) as c FROM movies
    WHERE (
      (overview_en IS NULL AND is_filtered = 0)
      OR (overview_en IS NOT NULL AND (title_ar = 'TBD' OR title_ar IS NULL))
      OR (overview_en IS NOT NULL AND has_cast = 0)
    )
  `).get().c
}

console.log('إحصائيات الأفلام:')
console.log(`  إجمالي الأفلام: ${stats.totalMovies.toLocaleString()}`)
console.log(`  أفلام بها overview: ${stats.moviesWithOverview.toLocaleString()} (${((stats.moviesWithOverview/stats.totalMovies)*100).toFixed(1)}%)`)
console.log(`  أفلام مكتملة: ${stats.moviesComplete.toLocaleString()} (${((stats.moviesComplete/stats.totalMovies)*100).toFixed(1)}%)`)
console.log(`  أفلام مفلترة: ${stats.moviesFiltered.toLocaleString()} (${((stats.moviesFiltered/stats.totalMovies)*100).toFixed(1)}%)`)
console.log(`  أفلام محتاجة سحب: ${stats.moviesPending.toLocaleString()} (${((stats.moviesPending/stats.totalMovies)*100).toFixed(1)}%)`)

// 6. التوصيات
console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║                      التقييم النهائي                       ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

const issues = []

if (missingTables.length > 0) {
  issues.push(`⚠️  جداول ناقصة: ${missingTables.join(', ')}`)
}

if (missingMoviesColumns.length > 0) {
  issues.push(`⚠️  أعمدة ناقصة في movies: ${missingMoviesColumns.length} عمود`)
}

if (!existingTables.includes('people')) {
  issues.push('⚠️  جدول people غير موجود - السكريبت لن يستطيع حفظ الممثلين')
}

if (!existingTables.includes('cast_crew')) {
  issues.push('⚠️  جدول cast_crew غير موجود - السكريبت لن يستطيع حفظ طاقم العمل')
}

if (!existingTables.includes('translation_cache')) {
  issues.push('⚠️  جدول translation_cache غير موجود - سيتم إعادة ترجمة كل شيء')
}

if (!existingTables.includes('ingestion_progress')) {
  issues.push('⚠️  جدول ingestion_progress غير موجود - لن يتم حفظ التقدم')
}

if (issues.length === 0) {
  console.log('✅ قاعدة البيانات جاهزة تماماً لسكريبتات السحب!')
  console.log('\n📝 يمكنك الآن:')
  console.log('  1. تشغيل INGEST-MOVIES-LOGIC.js لسحب بيانات الأفلام')
  console.log('  2. تشغيل INGEST-SERIES-LOGIC.js لسحب بيانات المسلسلات')
  console.log('  3. تشغيل sync-to-turso-*.js للمزامنة مع Turso')
} else {
  console.log('❌ قاعدة البيانات غير جاهزة بالكامل!\n')
  console.log('المشاكل المكتشفة:')
  issues.forEach(issue => console.log(`  ${issue}`))
  
  console.log('\n💡 الحل:')
  console.log('  قم بتشغيل: node setup-local-db-for-ingestion.js')
  console.log('  لإضافة الجداول والأعمدة الناقصة')
}

console.log('\n')
db.close()
