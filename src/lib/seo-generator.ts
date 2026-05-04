/**
 * ============================================
 * 🎯 DYNAMIC SEO GENERATOR FOR NEXT.JS
 * ============================================
 * Purpose: Generate SEO data on-the-fly without storing in Turso
 * Saves 30M writes per month!
 * ============================================
 */

export interface ContentData {
  title_ar?: string;
  title_en?: string;
  title_original?: string;
  overview_ar?: string;
  release_year?: number;
  first_air_year?: number;
  primary_genre?: string;
  vote_average?: number;
  keywords?: string | any[];
  slug?: string;
  content_type?: 'movie' | 'series';
}

/**
 * توليد الكلمات المفتاحية الذكية
 */
export function generateSEOKeywords(content: ContentData): string[] {
  const keywords: string[] = [];
  const { 
    title_ar, 
    title_en, 
    title_original,
    release_year, 
    first_air_year,
    primary_genre, 
    keywords: tmdb_keywords,
    content_type = 'movie'
  } = content;

  const year = release_year || first_air_year;
  const currentYear = new Date().getFullYear();
  const typeAr = content_type === 'movie' ? 'فيلم' : 'مسلسل';
  const typeEn = content_type === 'movie' ? 'movie' : 'series';

  // 1. كلمات TMDB الأصلية (5 كلمات)
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

  // 2. الكلمات العربية الأساسية
  if (title_ar && title_ar !== 'TBD') {
    keywords.push(`مشاهدة ${typeAr} ${title_ar}`);
    keywords.push(`تحميل ${typeAr} ${title_ar}`);
    keywords.push(`${typeAr} ${title_ar} مترجم`);
    
    if (year) {
      keywords.push(`${typeAr} ${title_ar} ${year}`);
    }
  }

  // 3. الكلمات الإنجليزية
  if (title_en && title_en !== 'TBD') {
    keywords.push(`Watch ${title_en} online`);
    keywords.push(`${title_en} ${year || ''} HD`.trim());
    
    if (title_ar && title_ar !== 'TBD') {
      keywords.push(`مشاهدة ${title_en} مترجم`);
    }
  }

  // 4. تريندات الجودة والمنصات
  if (title_ar && title_ar !== 'TBD') {
    keywords.push(`${typeAr} ${title_ar} HD`);
    keywords.push(`${typeAr} ${title_ar} 4K`);
    keywords.push(`${typeAr} ${title_ar} بدون اعلانات`);
    keywords.push(`${typeAr} ${title_ar} ايجي بست`);
    keywords.push(`${typeAr} ${title_ar} وي سيما`);
    keywords.push(`${typeAr} ${title_ar} ماي سيما`);
    keywords.push(`${typeAr} ${title_ar} تليجرام`);
  }

  // 5. كلمات التصنيف
  if (primary_genre) {
    const genreAr = content_type === 'movie' ? 'افلام' : 'مسلسلات';
    keywords.push(`${genreAr} ${primary_genre}`);
    
    if (year && year >= currentYear - 1) {
      keywords.push(`${genreAr} ${primary_genre} ${currentYear}`);
    }
  }

  // 6. كلمات السنة
  if (year && year >= currentYear - 2) {
    keywords.push(`${content_type === 'movie' ? 'افلام' : 'مسلسلات'} ${year}`);
  }

  // تنظيف وإزالة التكرار
  return [...new Set(keywords)]
    .filter(k => k && k.length > 2)
    .slice(0, 20);
}

/**
 * توليد عنوان SEO محسّن
 */
export function generateSEOTitle(content: ContentData, lang: 'ar' | 'en' = 'ar'): string {
  const { 
    title_ar, 
    title_en, 
    release_year, 
    first_air_year,
    primary_genre,
    content_type = 'movie'
  } = content;

  const year = release_year || first_air_year;
  const title = lang === 'ar' ? title_ar : title_en;
  
  if (!title || title === 'TBD') {
    return '';
  }

  if (lang === 'ar') {
    const typeAr = content_type === 'movie' ? 'فيلم' : 'مسلسل';
    let seoTitle = `مشاهدة ${typeAr} ${title}`;
    
    if (year) {
      seoTitle += ` ${year}`;
    }
    
    seoTitle += ' مترجم كامل بجودة HD';
    
    if (primary_genre && seoTitle.length < 55) {
      seoTitle += ` - ${primary_genre}`;
    }
    
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
 */
export function generateSEODescription(content: ContentData): string {
  const { 
    title_ar, 
    overview_ar,
    release_year, 
    first_air_year,
    primary_genre,
    vote_average,
    content_type = 'movie'
  } = content;

  const year = release_year || first_air_year;
  const typeAr = content_type === 'movie' ? 'فيلم' : 'مسلسل';
  
  if (!title_ar || title_ar === 'TBD') {
    return '';
  }

  let description = `مشاهدة وتحميل ${typeAr} ${title_ar}`;
  
  if (year) {
    description += ` ${year}`;
  }
  
  description += ' مترجم كامل بجودة عالية HD';
  
  if (primary_genre) {
    description += ` من نوع ${primary_genre}`;
  }
  
  if (vote_average && vote_average >= 7) {
    description += ` - تقييم ${vote_average}/10`;
  }
  
  description += '. مشاهدة مباشرة اون لاين بدون اعلانات.';
  
  if (description.length > 160) {
    description = `مشاهدة ${typeAr} ${title_ar} ${year || ''} مترجم HD - ${primary_genre || 'افلام اجنبية'}. تحميل مباشر بجودة عالية.`.trim();
  }
  
  return description;
}

/**
 * توليد URL كانونيكال
 */
export function generateCanonicalURL(content: ContentData, baseUrl: string = 'https://4cima.online'): string {
  const { slug, content_type = 'movie' } = content;
  
  if (!slug) {
    return '';
  }
  
  const path = content_type === 'movie' ? 'movies' : 'series';
  return `${baseUrl}/${path}/${slug}`;
}

/**
 * توليد كل بيانات SEO دفعة واحدة
 */
export function generateCompleteSEO(content: ContentData, baseUrl: string = 'https://4cima.online') {
  return {
    seo_keywords: generateSEOKeywords(content),
    seo_title_ar: generateSEOTitle(content, 'ar'),
    seo_title_en: generateSEOTitle(content, 'en'),
    seo_description_ar: generateSEODescription(content),
    canonical_url: generateCanonicalURL(content, baseUrl)
  };
}
