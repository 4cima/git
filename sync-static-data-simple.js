#!/usr/bin/env node
/**
 * مزامنة البيانات الثابتة إلى Turso
 * Genres, Countries, Languages
 */

import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env.local') })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

// الترجمة العربية للأنواع
const genresArabic = {
  'Action': 'أكشن',
  'Adventure': 'مغامرة',
  'Animation': 'رسوم متحركة',
  'Comedy': 'كوميديا',
  'Crime': 'جريمة',
  'Documentary': 'وثائقي',
  'Drama': 'دراما',
  'Family': 'عائلي',
  'Fantasy': 'خيال',
  'History': 'تاريخي',
  'Horror': 'رعب',
  'Music': 'موسيقى',
  'Mystery': 'غموض',
  'Romance': 'رومانسي',
  'Science Fiction': 'خيال علمي',
  'TV Movie': 'فيلم تلفزيوني',
  'Thriller': 'إثارة',
  'War': 'حرب',
  'Western': 'غربي',
  // TV Genres
  'Action & Adventure': 'أكشن ومغامرة',
  'Kids': 'أطفال',
  'News': 'أخبار',
  'Reality': 'واقعي',
  'Sci-Fi & Fantasy': 'خيال علمي وخيال',
  'Soap': 'مسلسل درامي',
  'Talk': 'برنامج حواري',
  'War & Politics': 'حرب وسياسة'
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function syncGenres() {
  console.log('\n📚 مزامنة الأنواع (Genres)...\n')

  // قراءة أنواع الأفلام
  const movieGenresFile = join(__dirname, 'scripts', 'tmdb-movie-genres.json')
  const movieGenres = JSON.parse(readFileSync(movieGenresFile, 'utf8')).genres

  // قراءة أنواع المسلسلات
  const tvGenresFile = join(__dirname, 'scripts', 'tmdb-tv-genres.json')
  const tvGenres = JSON.parse(readFileSync(tvGenresFile, 'utf8')).genres

  // دمج الأنواع (بدون تكرار)
  const allGenres = [...movieGenres]
  tvGenres.forEach(tvGenre => {
    if (!allGenres.find(g => g.id === tvGenre.id)) {
      allGenres.push(tvGenre)
    }
  })

  console.log(`📊 عدد الأنواع: ${allGenres.length}`)

  let inserted = 0
  let skipped = 0

  for (const genre of allGenres) {
    const nameAr = genresArabic[genre.name] || genre.name
    const slug = slugify(genre.name)

    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO genres (id, tmdb_id, name_en, name_ar, slug) VALUES (?, ?, ?, ?, ?)`,
        args: [genre.id, genre.id, genre.name, nameAr, slug]
      })
      console.log(`   ✅ ${genre.id}. ${genre.name} → ${nameAr}`)
      inserted++
    } catch (error) {
      console.log(`   ⚠️  ${genre.name}: ${error.message}`)
      skipped++
    }
  }

  console.log(`\n✅ تم إدراج ${inserted} نوع`)
  if (skipped > 0) console.log(`⚠️  تم تخطي ${skipped} نوع`)
}

async function syncCountries() {
  console.log('\n🌍 مزامنة الدول (Countries)...\n')

  const countriesFile = join(__dirname, 'scripts', 'tmdb-countries.json')
  const countries = JSON.parse(readFileSync(countriesFile, 'utf8'))

  console.log(`📊 عدد الدول: ${countries.length}`)

  let inserted = 0

  for (const country of countries.slice(0, 20)) { // أول 20 دولة فقط للسرعة
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO countries (iso_3166_1, english_name, arabic_name) VALUES (?, ?, ?)`,
        args: [country.iso_3166_1, country.english_name, country.arabic_name || country.english_name]
      })
      console.log(`   ✅ ${country.iso_3166_1}: ${country.english_name}`)
      inserted++
    } catch (error) {
      console.log(`   ⚠️  ${country.iso_3166_1}: ${error.message}`)
    }
  }

  console.log(`\n✅ تم إدراج ${inserted} دولة`)
}

async function syncLanguages() {
  console.log('\n🗣️  مزامنة اللغات (Languages)...\n')

  const languagesFile = join(__dirname, 'scripts', 'tmdb-languages.json')
  const languages = JSON.parse(readFileSync(languagesFile, 'utf8'))

  console.log(`📊 عدد اللغات: ${languages.length}`)

  let inserted = 0

  for (const lang of languages.slice(0, 20)) { // أول 20 لغة فقط
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO languages (iso_639_1, english_name, arabic_name) VALUES (?, ?, ?)`,
        args: [lang.iso_639_1, lang.english_name, lang.arabic_name || lang.english_name]
      })
      console.log(`   ✅ ${lang.iso_639_1}: ${lang.english_name}`)
      inserted++
    } catch (error) {
      console.log(`   ⚠️  ${lang.iso_639_1}: ${error.message}`)
    }
  }

  console.log(`\n✅ تم إدراج ${inserted} لغة`)
}

async function main() {
  console.log('═'.repeat(80))
  console.log('🔄 مزامنة البيانات الثابتة إلى Turso')
  console.log('═'.repeat(80))

  try {
    // 1. Genres (الأهم)
    await syncGenres()

    // 2. Countries
    await syncCountries()

    // 3. Languages
    await syncLanguages()

    console.log('\n' + '═'.repeat(80))
    console.log('✅ تمت مزامنة البيانات الثابتة بنجاح!')
    console.log('💡 الخطوة التالية: مزامنة الأفلام والمسلسلات')
    console.log('═'.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ خطأ:', error.message)
    process.exit(1)
  }
}

main()
