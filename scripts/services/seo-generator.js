/**
 * ============================================
 * 🎯 SEO GENERATOR — النسخة النظيفة (2026-10)
 * ============================================
 * Purpose: Generate optimized SEO data for movies and TV series
 * Strategy: TMDB keywords + genre only — NO forbidden words (مشاهدة/تحميل/أونلاين),
 *           NO platform names, NO English titles in Arabic SEO.
 * seo_title_ar / seo_description_ar return NULL — SSR generates them safely.
 * ============================================
 */

/**
 * توليد الكلمات المفتاحية الذكية
 * @param {Object} content - بيانات المحتوى
 * @returns {Array} - مصفوفة الكلمات المفتاحية
 */
function generateSEOKeywords(content) {
  const keywords = [];
  const { 
    title_ar, 
    release_year, 
    first_air_year,
    primary_genre, 
    keywords: tmdb_keywords,
    content_type 
  } = content;

  const year = release_year || first_air_year;
  const currentYear = new Date().getFullYear();
  const typeAr = content_type === 'movie' ? 'فيلم' : 'مسلسل';

  // 1. كلمات TMDB الأصلية فقط
  try {
    if (tmdb_keywords) {
      const parsed = typeof tmdb_keywords === 'string' 
        ? JSON.parse(tmdb_keywords) 
        : tmdb_keywords;
      
      if (Array.isArray(parsed)) {
        keywords.push(...parsed.slice(0, 5));
      }
    }
  } catch (e) {}

  // 2. كلمات التصنيف فقط (بدون مشاهدة/تحميل/أونلاين وبدون أسماء منافسين)
  if (primary_genre) {
    const genreAr = content_type === 'movie' ? 'افلام' : 'مسلسلات';
    keywords.push(`${genreAr} ${primary_genre}`);
    
    if (year && year >= currentYear - 1) {
      keywords.push(`${genreAr} ${primary_genre} ${year}`);
    }
  }

  // تنظيف وإزالة التكرار
  const uniqueKeywords = [...new Set(keywords)]
    .filter(k => k && k.length > 2)
    .slice(0, 10);

  return uniqueKeywords;
}

/**
 * توليد عنوان SEO محسّن
 * @param {Object} content - بيانات المحتوى
 * @param {string} lang - اللغة (ar/en)
 * @returns {string} - العنوان المحسّن
 */
function generateSEOTitle(content, lang = 'ar') {
  // SSR يولّد العنوان بأمان — لا نُلدّ slug أو عناوين من هنا لتفادي الكلمات المحظورة
  return null;
}

/**
 * توليد وصف SEO محسّن
 * @param {Object} content - بيانات المحتوى
 * @returns {string} - الوصف المحسّن (155-160 حرف)
 */
function generateSEODescription(content) {
  // SSR يولّد الوصف بأمان — لا نُلدّ أوصاف من هنا لتفادي الكلمات المحظورة
  return null;
}

/**
 * توليد URL كانونيكال
 * @param {Object} content - بيانات المحتوى
 * @param {string} baseUrl - الرابط الأساسي للموقع
 * @returns {string} - الرابط الكانونيكال
 */
function generateCanonicalURL(content, baseUrl = 'https://4cima.com') {
  const { slug, content_type } = content;
  
  if (!slug) {
    return null;
  }
  
  const path = content_type === 'movie' ? 'movies' : 'series';
  return `${baseUrl}/${path}/${slug}`;
}

/**
 * توليد كل بيانات SEO دفعة واحدة
 * @param {Object} content - بيانات المحتوى
 * @param {string} baseUrl - الرابط الأساسي للموقع
 * @returns {Object} - كل بيانات SEO
 */
function generateCompleteSEO(content, baseUrl = 'https://4cima.com') {
  return {
    seo_keywords_json: JSON.stringify(generateSEOKeywords(content)),
    seo_title_ar: generateSEOTitle(content, 'ar'),
    seo_title_en: generateSEOTitle(content, 'en'),
    seo_description_ar: generateSEODescription(content),
    canonical_url: generateCanonicalURL(content, baseUrl)
  };
}

module.exports = {
  generateSEOKeywords,
  generateSEOTitle,
  generateSEODescription,
  generateCanonicalURL,
  generateCompleteSEO
};
