// مقارنة تفصيلية بين القاعدة المحلية و Turso
const Database = require('better-sqlite3')
const { createClient } = require('@libsql/client')
require('dotenv').config({ path: './.env.local' })

const localDb = new Database('./data/4cima-local.db')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function compareStructure() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║         مقارنة تفصيلية: القاعدة المحلية vs Turso          ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  // 1. مقارنة عدد السجلات
  console.log('📊 المرحلة 1: مقارنة عدد السجلات\n')
  
  const localMoviesCount = localDb.prepare('SELECT COUNT(*) as c FROM movies').get().c
  const tursoMoviesCount = (await turso.execute('SELECT COUNT(*) as c FROM movies')).rows[0].c
  
  const localSeriesCount = localDb.prepare('SELECT COUNT(*) as c FROM tv_series').get().c
  const tursoSeriesCount = (await turso.execute('SELECT COUNT(*) as c FROM tv_series')).rows[0].c

  console.log('الأفلام:')
  console.log(`  محلي:  ${localMoviesCount.toLocaleString()} فيلم`)
  console.log(`  Turso: ${tursoSeriesCount.toLocaleString()} فيلم`)
  console.log(`  ${localMoviesCount === tursoMoviesCount ? '✅' : '⚠️'} ${localMoviesCount === tursoMoviesCount ? 'متطابق' : 'مختلف'}`)
  
  console.log('\nالمسلسلات:')
  console.log(`  محلي:  ${localSeriesCount.toLocaleString()} مسلسل`)
  console.log(`  Turso: ${tursoSeriesCount.toLocaleString()} مسلسل`)
  console.log(`  ${localSeriesCount === tursoSeriesCount ? '✅' : '⚠️'} ${localSeriesCount === tursoSeriesCount ? 'متطابق' : 'مختلف'}`)

  // 2. مقارنة اكتمال البيانات
  console.log('\n📋 المرحلة 2: مقارنة اكتمال البيانات\n')
  
  // الأفلام المحلية
  const localMoviesWithData = {
    withTitle: localDb.prepare("SELECT COUNT(*) as c FROM movies WHERE title_ar IS NOT NULL AND title_ar != 'TBD'").get().c,
    withOverview: localDb.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_ar IS NOT NULL').get().c,
    withPoster: localDb.prepare('SELECT COUNT(*) as c FROM movies WHERE poster_path IS NOT NULL').get().c,
    withBackdrop: localDb.prepare('SELECT COUNT(*) as c FROM movies WHERE backdrop_path IS NOT NULL').get().c,
    withTrailer: localDb.prepare('SELECT COUNT(*) as c FROM movies WHERE trailer_key IS NOT NULL').get().c,
    withGenres: localDb.prepare('SELECT COUNT(*) as c FROM movies WHERE has_genres = 1').get().c,
    withCast: localDb.prepare('SELECT COUNT(*) as c FROM movies WHERE has_cast = 1').get().c,
    complete: localDb.prepare('SELECT COUNT(*) as c FROM movies WHERE is_complete = 1').get().c
  }

  // الأفلام في Turso
  const tursoMoviesWithData = {
    withTitle: (await turso.execute('SELECT COUNT(*) as c FROM movies WHERE title_ar IS NOT NULL')).rows[0].c,
    withOverview: (await turso.execute('SELECT COUNT(*) as c FROM movies WHERE overview_ar IS NOT NULL')).rows[0].c,
    withPoster: (await turso.execute('SELECT COUNT(*) as c FROM movies WHERE poster_path IS NOT NULL')).rows[0].c,
    withBackdrop: (await turso.execute('SELECT COUNT(*) as c FROM movies WHERE backdrop_path IS NOT NULL')).rows[0].c,
    withTrailer: (await turso.execute('SELECT COUNT(*) as c FROM movies WHERE trailer_key IS NOT NULL')).rows[0].c,
    withGenres: (await turso.execute('SELECT COUNT(*) as c FROM movies WHERE genres_json IS NOT NULL')).rows[0].c,
    withCast: (await turso.execute('SELECT COUNT(*) as c FROM movies WHERE cast_json IS NOT NULL')).rows[0].c
  }

  console.log('الأفلام - البيانات الكاملة:')
  console.log('\n┌─────────────────┬──────────────┬──────────────┬──────────┐')
  console.log('│     البيان      │    محلي      │    Turso     │  الحالة  │')
  console.log('├─────────────────┼──────────────┼──────────────┼──────────┤')
  
  const compareField = (name, local, turso) => {
    const localPct = ((local / localMoviesCount) * 100).toFixed(1)
    const tursoPct = ((turso / tursoMoviesCount) * 100).toFixed(1)
    const status = turso > local ? '✅ Turso' : local > turso ? '⚠️ محلي' : '='
    console.log(`│ ${name.padEnd(15)} │ ${String(local).padStart(6)} (${localPct.padStart(4)}%) │ ${String(turso).padStart(6)} (${tursoPct.padStart(4)}%) │ ${status.padEnd(8)} │`)
  }

  compareField('عنوان عربي', localMoviesWithData.withTitle, tursoMoviesWithData.withTitle)
  compareField('وصف عربي', localMoviesWithData.withOverview, tursoMoviesWithData.withOverview)
  compareField('بوستر', localMoviesWithData.withPoster, tursoMoviesWithData.withPoster)
  compareField('خلفية', localMoviesWithData.withBackdrop, tursoMoviesWithData.withBackdrop)
  compareField('تريلر', localMoviesWithData.withTrailer, tursoMoviesWithData.withTrailer)
  compareField('تصنيفات', localMoviesWithData.withGenres, tursoMoviesWithData.withGenres)
  compareField('ممثلين', localMoviesWithData.withCast, tursoMoviesWithData.withCast)
  
  console.log('└─────────────────┴──────────────┴──────────────┴──────────┘')

  // 3. عينة من البيانات
  console.log('\n📝 المرحلة 3: عينة من البيانات (أول 3 أفلام)\n')
  
  const localSample = localDb.prepare(`
    SELECT id, title_ar, title_en, overview_ar, poster_path, vote_average, release_year
    FROM movies 
    ORDER BY vote_count DESC 
    LIMIT 3
  `).all()

  const tursoSample = (await turso.execute(`
    SELECT id, title_ar, title_en, overview_ar, poster_path, vote_average, release_year
    FROM movies 
    ORDER BY id
    LIMIT 3
  `)).rows

  console.log('🗂️  القاعدة المحلية:')
  localSample.forEach((movie, i) => {
    console.log(`\n${i + 1}. فيلم ID: ${movie.id}`)
    console.log(`   عنوان عربي: ${movie.title_ar || '❌ غير موجود'}`)
    console.log(`   عنوان إنجليزي: ${movie.title_en || '❌ غير موجود'}`)
    console.log(`   وصف: ${movie.overview_ar ? '✅ موجود (' + movie.overview_ar.substring(0, 50) + '...)' : '❌ غير موجود'}`)
    console.log(`   بوستر: ${movie.poster_path || '❌ غير موجود'}`)
    console.log(`   تقييم: ${movie.vote_average || 'N/A'}`)
    console.log(`   سنة: ${movie.release_year || 'N/A'}`)
  })

  console.log('\n\n🌐 Turso (Production):')
  tursoSample.forEach((movie, i) => {
    console.log(`\n${i + 1}. فيلم ID: ${movie.id}`)
    console.log(`   عنوان عربي: ${movie.title_ar || '❌ غير موجود'}`)
    console.log(`   عنوان إنجليزي: ${movie.title_en || '❌ غير موجود'}`)
    console.log(`   وصف: ${movie.overview_ar ? '✅ موجود (' + movie.overview_ar.substring(0, 50) + '...)' : '❌ غير موجود'}`)
    console.log(`   بوستر: ${movie.poster_path || '❌ غير موجود'}`)
    console.log(`   تقييم: ${movie.vote_average || 'N/A'}`)
    console.log(`   سنة: ${movie.release_year || 'N/A'}`)
  })

  // 4. الخلاصة النهائية
  console.log('\n\n╔════════════════════════════════════════════════════════════╗')
  console.log('║                        الخلاصة                             ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  const localDataCompleteness = (localMoviesWithData.complete / localMoviesCount * 100).toFixed(1)
  const tursoDataCompleteness = (tursoMoviesWithData.withOverview / tursoMoviesCount * 100).toFixed(1)

  console.log('📌 القاعدة المحلية:')
  console.log(`   • العدد: ${localMoviesCount.toLocaleString()} فيلم`)
  console.log(`   • البيانات الكاملة: ${localMoviesWithData.complete.toLocaleString()} (${localDataCompleteness}%)`)
  console.log(`   • الحالة: ${localDataCompleteness === '0.0' ? '⚠️ IDs فقط - تحتاج سحب البيانات من TMDB' : '✅ جاهزة'}`)

  console.log('\n📌 Turso (Production):')
  console.log(`   • العدد: ${tursoMoviesCount.toLocaleString()} فيلم`)
  console.log(`   • البيانات الكاملة: ${tursoMoviesWithData.withOverview.toLocaleString()} (${tursoDataCompleteness}%)`)
  console.log(`   • الحالة: ✅ جاهزة للإنتاج`)

  console.log('\n💡 التوصية:')
  if (localDataCompleteness === '0.0') {
    console.log('   القاعدة المحلية تحتوي على IDs فقط.')
    console.log('   يجب تشغيل سكريبتات السحب لملء البيانات:')
    console.log('   → node BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup')
    console.log('   → node BACKUP/scripts/INGEST-SERIES-LOGIC.js.backup')
  } else {
    console.log('   القاعدة المحلية جاهزة للمزامنة مع Turso')
    console.log('   → node BACKUP/scripts/sync-to-turso-optimized.js.backup')
  }

  console.log('\n')
  localDb.close()
}

compareStructure().catch(console.error)
