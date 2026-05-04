/**
 * ============================================
 * 🎯 SMART SEO GENERATOR
 * ============================================
 * Purpose: Generate optimized SEO data for movies and TV series
 * Strategy: Combine TMDB keywords + trending search terms + competitor names
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
    title_en, 
    title_original,
    release_year, 
    first_air_year,
    primary_genre, 
    keywords: tmdb_keywords,
    content_type 
  } = content;

  const year = release_year || first_air_year;
  const currentYear = new Date().getFullYear();
  const typeAr = content_type === 'movie' ? 'فيلم' : 'مسلسل';
  const typeEn = content_type === 'movie' ? 'movie' : 'series';

  // 1. كلمات TMDB الأصلية (للتوصيات والمشابهة)
  try {
    if (tmdb_keywords) {
      const parsed = typeof tmdb_keywords === 'string' 
        ? JSON.parse(tmdb_keywords) 
        : tmdb_keywords;
      
      if (Array.isArray(parsed)) {
        keywords.push(...parsed.slice(0, 5)); // أول 5 كلمات فقط
      }
    }
  } catch (e) {}

  // 2. الكلمات العربية الأساسية (High Intent)
  if (title_ar && title_ar !== 'TBD') {
    keywords.push(`مشاهدة ${typeAr} ${title_ar}`);
    keywords.push(`تحميل ${typeAr} ${title_ar}`);
    keywords.push(`${typeAr} ${title_ar} مترجم`);
    
    if (year) {
      keywords.push(`${typeAr} ${title_ar} ${year}`);
    }
  }

  // 3. الكلمات الإنجليزية (Global Reach)
  if (title_en && title_en !== 'TBD') {
    keywords.push(`Watch ${title_en} online`);
    keywords.push(`${title_en} ${year || ''} HD`.trim());
    
    // دمج اللغتين (تريند قوي)
    if (title_ar && title_ar !== 'TBD') {
      keywords.push(`مشاهدة ${title_en} مترجم`);
    }
  }

  // 4. تريندات الجودة والمنصات (2026 Trends)
  if (title_ar && title_ar !== 'TBD') {
    keywords.push(`${typeAr} ${title_ar} HD`);
    keywords.push(`${typeAr} ${title_ar} 4K`);
    keywords.push(`${typeAr} ${title_ar} بدون اعلانات`);
    
    // أسماء المنافسين (SEO Hijacking)
    keywords.push(`${typeAr} ${title_ar} ايجي بست`);
    keywords.push(`${typeAr} ${title_ar} وي سيما`);
    keywords.push(`${typeAr} ${title_ar} ماي سيما`);
    keywords.push(`${typeAr} ${title_ar} تليجرام`);
  }

  // 5. كلمات التصنيف (Genre-based)
  if (primary_genre) {
    const genreAr = content_type === 'movie' ? 'افلام' : 'مسلسلات';
    keywords.push(`${genreAr} ${primary_genre}`);
    
    if (year >= currentYear - 1) {
      keywords.push(`${genreAr} ${primary_genre} ${currentYear}`);
    }
  }

  // 6. كلمات السنة (Time-based)
  if (year >= currentYear - 2) {
    keywords.push(`${content_type === 'movie' ? 'افلام' : 'مسلسلات'} ${year}`);
  }

  // تنظيف وإزالة التكرار
  const uniqueKeywords = [...new Set(keywords)]
    .filter(k => k && k.length > 2)
    .slice(0, 20); // حد أقصى 20 كلمة

  return uniqueKeywords;
}

/**
 * توليد عنوان SEO محسّن
 * @param {Object} content - بيانات المحتوى
 * @param {string} lang - اللغة (ar/en)
 * @returns {string} - العنوان المحسّن
 */
function generateSEOTitle(content, lang = 'ar') {
  const { 
    title_ar, 
    title_en, 
    release_year, 
    first_air_year,
    primary_genre,
    content_type 
  } = content;

  const year = release_year || first_air_year;
  const title = lang === 'ar' ? title_ar : title_en;
  
  if (!title || title === 'TBD') {
    return null;
  }

  if (lang === 'ar') {
    const typeAr = content_type === 'movie' ? 'فيلم' : 'مسلسل';
    let seoTitle = `مشاهدة ${typeAr} ${title}`;
    
    if (year) {
      seoTitle += ` ${year}`;
    }
    
    seoTitle += ' مترجم كامل بجودة HD';
    
    if (primary_genre) {
      seoTitle += ` - ${primary_genre}`;
    }
    
    // الحد الأقصى 60 حرف للعنوان
    return seoTitle.length > 60 
      ? `مشاهدة ${typeAr} ${title} ${year || ''} مترجم HD`.trim()
      : seoTitle;
  } else {
    const typeEn = content_type === 'movie' ? 'Movie' : 'Series';
    let seoTitle = `Watch ${title} ${year || ''} ${typeEn}`.trim();
    seoTitle += ' Online HD';
    
    return seoTitle.length > 60 
      ? `Watch ${title} ${year || ''} Online`.trim()
      : seoTitle;
  }
}

/**
 * توليد وصف SEO محسّن
 * @param {Object} content - بيانات المحتوى
 * @returns {string} - الوصف المحسّن (155-160 حرف)
 */
function generateSEODescription(content) {
  const { 
    title_ar, 
    overview_ar,
    release_year, 
    first_air_year,
    primary_genre,
    vote_average,
    content_type 
  } = content;

  const year = release_year || first_air_year;
  const typeAr = content_type === 'movie' ? 'فيلم' : 'مسلسل';
  
  if (!title_ar || title_ar === 'TBD') {
    return null;
  }

  let description = `مشاهدة وتحميل ${typeAr} ${title_ar}`;
  
  if (year) {
    description += ` ${year}`;
  }
  
  description += ' مترجم كامل بجودة عالية HD';
  
  if (primary_genre) {
    description += ` من نوع ${primary_genre}`;
  }
  
  if (vote_average >= 7) {
    description += ` - تقييم ${vote_average}/10`;
  }
  
  description += '. مشاهدة مباشرة اون لاين بدون اعلانات.';
  
  // الحد الأقصى 160 حرف
  if (description.length > 160) {
    description = `مشاهدة ${typeAr} ${title_ar} ${year || ''} مترجم HD - ${primary_genre || 'افلام اجنبية'}. تحميل مباشر بجودة عالية.`.trim();
  }
  
  return description;
}

/**
 * توليد URL كانونيكال
 * @param {Object} content - بيانات المحتوى
 * @param {string} baseUrl - الرابط الأساسي للموقع
 * @returns {string} - الرابط الكانونيكال
 */
function generateCanonicalURL(content, baseUrl = 'https://4cima.online') {
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
function generateCompleteSEO(content, baseUrl = 'https://4cima.online') {
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
