/**
 * Helper functions للبيانات الثابتة
 */

const config = require('../tmdb-config.json')
const countries = require('../tmdb-countries.json')
const languages = require('../tmdb-languages.json')
const movieCerts = require('../tmdb-movie-certifications.json')
const tvCerts = require('../tmdb-tv-certifications.json')

// ═══════════════════════════════════════════════════════════
// 1. الصور
// ═══════════════════════════════════════════════════════════

function getImageUrl(path, type = 'poster', size = 'w500') {
  if (!path) return null
  const baseUrl = config.images.secure_base_url
  return `${baseUrl}${size}${path}`
}

function getPosterUrl(path, size = 'w500') {
  return getImageUrl(path, 'poster', size)
}

function getBackdropUrl(path, size = 'w1280') {
  return getImageUrl(path, 'backdrop', size)
}

function getProfileUrl(path, size = 'w185') {
  return getImageUrl(path, 'profile', size)
}

// ═══════════════════════════════════════════════════════════
// 2. الدول
// ═══════════════════════════════════════════════════════════

function getCountryName(iso, useNative = false) {
  if (!iso) return null
  const country = countries.find(c => c.iso_3166_1 === iso)
  if (!country) return iso
  return useNative ? country.native_name : country.english_name
}

function getCountryNameArabic(iso) {
  // يمكن إضافة ترجمات عربية للدول هنا
  const arabicNames = {
    'US': 'الولايات المتحدة',
    'GB': 'المملكة المتحدة',
    'FR': 'فرنسا',
    'EG': 'مصر',
    'SA': 'السعودية',
    'AE': 'الإمارات',
    'IN': 'الهند',
    'JP': 'اليابان',
    'KR': 'كوريا الجنوبية',
    'CN': 'الصين'
  }
  return arabicNames[iso] || getCountryName(iso)
}

// ═══════════════════════════════════════════════════════════
// 3. اللغات
// ═══════════════════════════════════════════════════════════

function getLanguageName(iso) {
  if (!iso) return null
  const lang = languages.find(l => l.iso_639_1 === iso)
  return lang ? lang.english_name : iso
}

function getLanguageNameArabic(iso) {
  const arabicNames = {
    'ar': 'العربية',
    'en': 'الإنجليزية',
    'fr': 'الفرنسية',
    'es': 'الإسبانية',
    'de': 'الألمانية',
    'it': 'الإيطالية',
    'ja': 'اليابانية',
    'ko': 'الكورية',
    'zh': 'الصينية',
    'hi': 'الهندية',
    'tr': 'التركية'
  }
  return arabicNames[iso] || getLanguageName(iso)
}

// ═══════════════════════════════════════════════════════════
// 4. التصنيفات العمرية
// ═══════════════════════════════════════════════════════════

function getMovieRating(releaseInfo) {
  if (!releaseInfo || !releaseInfo.results) return 'NR'
  
  // أولوية: مصر > السعودية > أمريكا > أي دولة
  const priority = ['EG', 'SA', 'US']
  
  for (const country of priority) {
    const release = releaseInfo.results.find(r => r.iso_3166_1 === country)
    if (release && release.release_dates && release.release_dates[0]) {
      const cert = release.release_dates[0].certification
      if (cert) return cert
    }
  }
  
  // أي تصنيف متاح
  for (const release of releaseInfo.results) {
    if (release.release_dates && release.release_dates[0]) {
      const cert = release.release_dates[0].certification
      if (cert) return cert
    }
  }
  
  return 'NR'
}

function getTVRating(contentRatings) {
  if (!contentRatings || !contentRatings.results) return 'NR'
  
  const priority = ['EG', 'SA', 'US']
  
  for (const country of priority) {
    const rating = contentRatings.results.find(r => r.iso_3166_1 === country)
    if (rating && rating.rating) return rating.rating
  }
  
  // أي تصنيف متاح
  if (contentRatings.results[0] && contentRatings.results[0].rating) {
    return contentRatings.results[0].rating
  }
  
  return 'NR'
}

function getRatingDescription(rating, type = 'movie') {
  const descriptions = {
    // أمريكا - أفلام
    'G': 'للجميع',
    'PG': 'يُنصح بإشراف الأهل',
    'PG-13': '+13 - يُنصح بإشراف الأهل',
    'R': '+17 - للبالغين',
    'NC-17': '+18 - للبالغين فقط',
    
    // أمريكا - مسلسلات
    'TV-Y': 'للأطفال',
    'TV-Y7': '+7',
    'TV-G': 'للجميع',
    'TV-PG': 'يُنصح بإشراف الأهل',
    'TV-14': '+14',
    'TV-MA': '+17 - للبالغين',
    
    'NR': 'غير مصنف'
  }
  
  return descriptions[rating] || rating
}

// ═══════════════════════════════════════════════════════════
// 5. معلومات إضافية
// ═══════════════════════════════════════════════════════════

function formatRuntime(minutes) {
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) return `${mins} دقيقة`
  if (mins === 0) return `${hours} ساعة`
  return `${hours} ساعة و ${mins} دقيقة`
}

function formatDate(dateString, locale = 'ar') {
  if (!dateString) return null
  const date = new Date(dateString)
  
  if (locale === 'ar') {
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// ═══════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════

module.exports = {
  // صور
  getImageUrl,
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  
  // دول
  getCountryName,
  getCountryNameArabic,
  
  // لغات
  getLanguageName,
  getLanguageNameArabic,
  
  // تصنيفات
  getMovieRating,
  getTVRating,
  getRatingDescription,
  
  // تنسيق
  formatRuntime,
  formatDate
}
