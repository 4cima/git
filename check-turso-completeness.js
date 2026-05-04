// ============================================
// 🔍 فحص شامل لبيانات Turso
// ============================================
require('dotenv').config({ path: './.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function main() {
  console.log('🔍 فحص شامل لبيانات Turso\n')
  console.log('═'.repeat(100))

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1️⃣ الأفلام
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n🎬 الأفلام:')
    console.log('─'.repeat(100))

    const moviesStats = await turso.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN title_ar IS NOT NULL AND title_ar != '' THEN 1 END) as with_ar_title,
        COUNT(CASE WHEN overview_ar IS NOT NULL AND overview_ar != '' THEN 1 END) as with_ar_overview,
        COUNT(CASE WHEN poster_path IS NOT NULL AND poster_path != '' THEN 1 END) as with_poster,
        COUNT(CASE WHEN title_ar IS NULL OR title_ar = '' THEN 1 END) as missing_ar_title,
        COUNT(CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 END) as missing_ar_overview,
        COUNT(CASE WHEN poster_path IS NULL OR poster_path = '' THEN 1 END) as missing_poster
      FROM movies
    `)

    const moviesRow = moviesStats.rows[0]
    const total = moviesRow[0]
    const withArTitle = moviesRow[1]
    const withArOverview = moviesRow[2]
    const withPoster = moviesRow[3]
    const missingArTitle = moviesRow[4]
    const missingArOverview = moviesRow[5]
    const missingPoster = moviesRow[6]

    console.log(`📊 الإجمالي: ${total.toLocaleString()}`)
    console.log(`✅ مع عنوان عربي: ${withArTitle.toLocaleString()} (${((withArTitle / total) * 100).toFixed(1)}%)`)
    console.log(`✅ مع وصف عربي: ${withArOverview.toLocaleString()} (${((withArOverview / total) * 100).toFixed(1)}%)`)
    console.log(`✅ مع صورة: ${withPoster.toLocaleString()} (${((withPoster / total) * 100).toFixed(1)}%)`)
    console.log(`❌ بدون عنوان عربي: ${missingArTitle.toLocaleString()}`)
    console.log(`❌ بدون وصف عربي: ${missingArOverview.toLocaleString()}`)
    console.log(`❌ بدون صورة: ${missingPoster.toLocaleString()}`)

    // الاكتمال
    const completeMovies = Math.min(withArTitle, withArOverview, withPoster)
    console.log(`\n🎯 الأفلام المكتملة (عنوان عربي + وصف عربي + صورة): ${completeMovies.toLocaleString()} (${((completeMovies / total) * 100).toFixed(1)}%)`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2️⃣ المسلسلات
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📺 المسلسلات:')
    console.log('─'.repeat(100))

    const seriesStats = await turso.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN name_ar IS NOT NULL AND name_ar != '' THEN 1 END) as with_ar_name,
        COUNT(CASE WHEN overview_ar IS NOT NULL AND overview_ar != '' THEN 1 END) as with_ar_overview,
        COUNT(CASE WHEN poster_path IS NOT NULL AND poster_path != '' THEN 1 END) as with_poster,
        COUNT(CASE WHEN name_ar IS NULL OR name_ar = '' THEN 1 END) as missing_ar_name,
        COUNT(CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 END) as missing_ar_overview,
        COUNT(CASE WHEN poster_path IS NULL OR poster_path = '' THEN 1 END) as missing_poster
      FROM tv_series
    `)

    const seriesRow = seriesStats.rows[0]
    const seriesTotal = seriesRow[0]
    const seriesWithArName = seriesRow[1]
    const seriesWithArOverview = seriesRow[2]
    const seriesWithPoster = seriesRow[3]
    const seriesMissingArName = seriesRow[4]
    const seriesMissingArOverview = seriesRow[5]
    const seriesMissingPoster = seriesRow[6]

    console.log(`📊 الإجمالي: ${seriesTotal.toLocaleString()}`)
    console.log(`✅ مع اسم عربي: ${seriesWithArName.toLocaleString()} (${((seriesWithArName / seriesTotal) * 100).toFixed(1)}%)`)
    console.log(`✅ مع وصف عربي: ${seriesWithArOverview.toLocaleString()} (${((seriesWithArOverview / seriesTotal) * 100).toFixed(1)}%)`)
    console.log(`✅ مع صورة: ${seriesWithPoster.toLocaleString()} (${((seriesWithPoster / seriesTotal) * 100).toFixed(1)}%)`)
    console.log(`❌ بدون اسم عربي: ${seriesMissingArName.toLocaleString()}`)
    console.log(`❌ بدون وصف عربي: ${seriesMissingArOverview.toLocaleString()}`)
    console.log(`❌ بدون صورة: ${seriesMissingPoster.toLocaleString()}`)

    // الاكتمال
    const completeSeries = Math.min(seriesWithArName, seriesWithArOverview, seriesWithPoster)
    console.log(`\n🎯 المسلسلات المكتملة (اسم عربي + وصف عربي + صورة): ${completeSeries.toLocaleString()} (${((completeSeries / seriesTotal) * 100).toFixed(1)}%)`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3️⃣ الملخص
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n' + '═'.repeat(100))
    console.log('📊 الملخص الشامل:')
    console.log('═'.repeat(100))

    const totalAll = total + seriesTotal
    const totalComplete = completeMovies + completeSeries
    const totalIncomplete = totalAll - totalComplete

    console.log('\n🎬 الأفلام:')
    console.log(`  📦 إجمالي: ${total.toLocaleString()}`)
    console.log(`  ✅ مكتملة: ${completeMovies.toLocaleString()} (${((completeMovies / total) * 100).toFixed(1)}%)`)
    console.log(`  ❌ ناقصة: ${(total - completeMovies).toLocaleString()} (${(((total - completeMovies) / total) * 100).toFixed(1)}%)`)

    console.log('\n📺 المسلسلات:')
    console.log(`  📦 إجمالي: ${seriesTotal.toLocaleString()}`)
    console.log(`  ✅ مكتملة: ${completeSeries.toLocaleString()} (${((completeSeries / seriesTotal) * 100).toFixed(1)}%)`)
    console.log(`  ❌ ناقصة: ${(seriesTotal - completeSeries).toLocaleString()} (${(((seriesTotal - completeSeries) / seriesTotal) * 100).toFixed(1)}%)`)

    console.log('\n📈 الإجمالي:')
    console.log(`  📦 إجمالي: ${totalAll.toLocaleString()}`)
    console.log(`  ✅ مكتملة: ${totalComplete.toLocaleString()} (${((totalComplete / totalAll) * 100).toFixed(1)}%)`)
    console.log(`  ❌ ناقصة: ${totalIncomplete.toLocaleString()} (${((totalIncomplete / totalAll) * 100).toFixed(1)}%)`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4️⃣ عينات من البيانات الناقصة
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n' + '═'.repeat(100))
    console.log('📋 عينات من البيانات الناقصة:')
    console.log('═'.repeat(100))

    if (missingArTitle > 0 || missingArOverview > 0 || missingPoster > 0) {
      console.log('\n🎬 أفلام ناقصة:')
      const incompletMovies = await turso.execute(`
        SELECT id, title_en, title_ar, overview_ar, poster_path FROM movies
        WHERE (title_ar IS NULL OR title_ar = '' OR overview_ar IS NULL OR overview_ar = '' OR poster_path IS NULL OR poster_path = '')
        LIMIT 5
      `)
      incompletMovies.rows.forEach((row, i) => {
        console.log(`\n  ${i + 1}. ID: ${row[0]} | ${row[1]}`)
        console.log(`     - عنوان عربي: ${row[2] ? '✅' : '❌'}`)
        console.log(`     - وصف عربي: ${row[3] ? '✅' : '❌'}`)
        console.log(`     - صورة: ${row[4] ? '✅' : '❌'}`)
      })
    }

    if (seriesMissingArName > 0 || seriesMissingArOverview > 0 || seriesMissingPoster > 0) {
      console.log('\n📺 مسلسلات ناقصة:')
      const incompleteSeries = await turso.execute(`
        SELECT id, name_en, name_ar, overview_ar, poster_path FROM tv_series
        WHERE (name_ar IS NULL OR name_ar = '' OR overview_ar IS NULL OR overview_ar = '' OR poster_path IS NULL OR poster_path = '')
        LIMIT 5
      `)
      incompleteSeries.rows.forEach((row, i) => {
        console.log(`\n  ${i + 1}. ID: ${row[0]} | ${row[1]}`)
        console.log(`     - اسم عربي: ${row[2] ? '✅' : '❌'}`)
        console.log(`     - وصف عربي: ${row[3] ? '✅' : '❌'}`)
        console.log(`     - صورة: ${row[4] ? '✅' : '❌'}`)
      })
    }

    console.log('\n' + '═'.repeat(100) + '\n')

  } catch (error) {
    console.error('❌ خطأ:', error.message)
  }
}

main()
