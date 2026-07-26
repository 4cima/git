// ═══════════════════════════════════════════════════════════════════
// 🔓 AUTO UNFILTER CONTENT
// ═══════════════════════════════════════════════════════════════════
// Purpose: فك الفلترة تلقائياً للمحتوى الذي لم يعد يطابق شروط الفلترة
// يتم تشغيله بعد تغيير شروط الفلترة في content-filter.js
// ═══════════════════════════════════════════════════════════════════

require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')
const { shouldFilterContent, getFilterReason } = require('./services/content-filter')

console.log('🔓 بدء فك الفلترة التلقائي للمحتوى...\n')

const stats = {
  movies: { checked: 0, unfiltered: 0, stillFiltered: 0 },
  series: { checked: 0, unfiltered: 0, stillFiltered: 0 }
}

// ═══════════════════════════════════════════════════════════════════
// 1️⃣ فحص الأفلام المفلترة
// ═══════════════════════════════════════════════════════════════════
console.log('🎬 فحص الأفلام المفلترة...\n')

const filteredMovies = db.prepare(`
  SELECT id, title_en, overview_en, poster_path, vote_average, vote_count, 
         release_date, filter_reason
  FROM movies 
  WHERE is_filtered = 1
`).all()

console.log(`📦 إجمالي الأفلام المفلترة: ${filteredMovies.length.toLocaleString()}\n`)

for (const movie of filteredMovies) {
  stats.movies.checked++
  
  // تحويل البيانات لصيغة TMDB
  const movieData = {
    id: movie.id,
    title: movie.title_en,
    overview: movie.overview_en,
    poster_path: movie.poster_path,
    vote_average: movie.vote_average || 0,
    vote_count: movie.vote_count || 0,
    release_date: movie.release_date,
    adult: false // الأفلام لا تحتوي على adult flag في قاعدتنا
  }
  
  // فحص إذا كان لا يزال يجب فلترته
  if (!shouldFilterContent(movieData)) {
    // فك الفلترة
    db.prepare(`
      UPDATE movies 
      SET is_filtered = 0, filter_reason = NULL 
      WHERE id = ?
    `).run(movie.id)
    
    stats.movies.unfiltered++
    
    if (stats.movies.unfiltered % 100 === 0) {
      console.log(`✅ تم فك فلترة ${stats.movies.unfiltered} فيلم...`)
    }
  } else {
    // تحديث سبب الفلترة (قد يكون تغير)
    const newReason = getFilterReason(movieData)
    if (newReason !== movie.filter_reason) {
      db.prepare(`
        UPDATE movies 
        SET filter_reason = ? 
        WHERE id = ?
      `).run(newReason, movie.id)
    }
    stats.movies.stillFiltered++
  }
  
  if (stats.movies.checked % 10000 === 0) {
    console.log(`⏳ تم فحص ${stats.movies.checked.toLocaleString()} / ${filteredMovies.length.toLocaleString()} فيلم`)
  }
}

console.log(`\n✅ اكتمل فحص الأفلام:`)
console.log(`   - تم فحص: ${stats.movies.checked.toLocaleString()}`)
console.log(`   - تم فك الفلترة: ${stats.movies.unfiltered.toLocaleString()}`)
console.log(`   - لا يزال مفلتر: ${stats.movies.stillFiltered.toLocaleString()}`)

// ═══════════════════════════════════════════════════════════════════
// 2️⃣ فحص المسلسلات المفلترة
// ═══════════════════════════════════════════════════════════════════
console.log('\n═'.repeat(80))
console.log('\n📺 فحص المسلسلات المفلترة...\n')

const filteredSeries = db.prepare(`
  SELECT id, title_en, overview_en, poster_path, vote_average, vote_count, 
         first_air_date, filter_reason
  FROM tv_series 
  WHERE is_filtered = 1
`).all()

console.log(`📦 إجمالي المسلسلات المفلترة: ${filteredSeries.length.toLocaleString()}\n`)

for (const series of filteredSeries) {
  stats.series.checked++
  
  // تحويل البيانات لصيغة TMDB
  const seriesData = {
    id: series.id,
    name: series.title_en,
    overview: series.overview_en,
    poster_path: series.poster_path,
    vote_average: series.vote_average || 0,
    vote_count: series.vote_count || 0,
    first_air_date: series.first_air_date,
    adult: false // المسلسلات لا تحتوي على adult flag
  }
  
  // فحص إذا كان لا يزال يجب فلترته
  if (!shouldFilterContent(seriesData)) {
    // فك الفلترة
    db.prepare(`
      UPDATE tv_series 
      SET is_filtered = 0, filter_reason = NULL 
      WHERE id = ?
    `).run(series.id)
    
    stats.series.unfiltered++
    
    if (stats.series.unfiltered % 100 === 0) {
      console.log(`✅ تم فك فلترة ${stats.series.unfiltered} مسلسل...`)
    }
  } else {
    // تحديث سبب الفلترة (قد يكون تغير)
    const newReason = getFilterReason(seriesData)
    if (newReason !== series.filter_reason) {
      db.prepare(`
        UPDATE tv_series 
        SET filter_reason = ? 
        WHERE id = ?
      `).run(newReason, series.id)
    }
    stats.series.stillFiltered++
  }
  
  if (stats.series.checked % 1000 === 0) {
    console.log(`⏳ تم فحص ${stats.series.checked.toLocaleString()} / ${filteredSeries.length.toLocaleString()} مسلسل`)
  }
}

console.log(`\n✅ اكتمل فحص المسلسلات:`)
console.log(`   - تم فحص: ${stats.series.checked.toLocaleString()}`)
console.log(`   - تم فك الفلترة: ${stats.series.unfiltered.toLocaleString()}`)
console.log(`   - لا يزال مفلتر: ${stats.series.stillFiltered.toLocaleString()}`)

// ═══════════════════════════════════════════════════════════════════
// 3️⃣ الخلاصة النهائية
// ═══════════════════════════════════════════════════════════════════
console.log('\n═'.repeat(80))
console.log('\n📊 الخلاصة النهائية:\n')

console.log('╔═══════════════════════════════════════════════════════════╗')
console.log('║              🔓 نتائج فك الفلترة التلقائي              ║')
console.log('╠═══════════════════════════════════════════════════════════╣')
console.log(`║ الأفلام:                                                 ║`)
console.log(`║   - تم فك الفلترة:    ${String(stats.movies.unfiltered).padStart(10)} فيلم        ║`)
console.log(`║   - لا يزال مفلتر:     ${String(stats.movies.stillFiltered).padStart(10)} فيلم        ║`)
console.log(`║                                                           ║`)
console.log(`║ المسلسلات:                                               ║`)
console.log(`║   - تم فك الفلترة:    ${String(stats.series.unfiltered).padStart(10)} مسلسل       ║`)
console.log(`║   - لا يزال مفلتر:     ${String(stats.series.stillFiltered).padStart(10)} مسلسل       ║`)
console.log(`║                                                           ║`)
console.log(`║ الإجمالي:                                                ║`)
console.log(`║   - تم فك الفلترة:    ${String(stats.movies.unfiltered + stats.series.unfiltered).padStart(10)} عمل         ║`)
console.log('╚═══════════════════════════════════════════════════════════╝')

console.log('\n✅ اكتمل فك الفلترة التلقائي!')
console.log('💡 يمكنك الآن تشغيل سكريبتات السحب لتحديث المحتوى المفكوك\n')
