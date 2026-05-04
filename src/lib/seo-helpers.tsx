/**
 * ============================================
 * 🎯 SEO HELPERS FOR NEXT.JS
 * ============================================
 * Purpose: Helper functions to use SEO data in Next.js pages
 * Strategy: Generate SEO dynamically to save Turso writes
 * ============================================
 */

import { Metadata } from 'next';
import { generateCompleteSEO, ContentData } from './seo-generator';

export interface SEOContent extends ContentData {
  overview_ar?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
}

/**
 * توليد Metadata لصفحة فيلم أو مسلسل
 * يولد SEO ديناميكياً بدون الحاجة لتخزينه في Turso
 */
export function generateContentMetadata(content: SEOContent): Metadata {
  // توليد SEO ديناميكياً
  const seoData = generateCompleteSEO(content);
  const keywords = seoData.seo_keywords;

  const title = seoData.seo_title_ar || content.title_ar || '';
  const description = seoData.seo_description_ar || content.overview_ar || '';
  const posterUrl = content.poster_path 
    ? `https://image.tmdb.org/t/p/w1280${content.poster_path}`
    : '/public/logo.svg';

  return {
    title,
    description,
    keywords: keywords.join(', '),
    
    // Open Graph (Facebook, WhatsApp, etc.)
    openGraph: {
      title,
      description,
      url: seoData.canonical_url,
      siteName: '4cima',
      images: [
        {
          url: posterUrl,
          width: 1280,
          height: 1920,
          alt: content.title_ar || '',
        },
      ],
      locale: 'ar_EG',
      type: 'video.movie',
    },
    
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [posterUrl],
    },
    
    // Canonical URL
    alternates: {
      canonical: seoData.canonical_url,
    },
    
    // Additional metadata
    other: {
      'rating': content.vote_average?.toString() || '0',
      'votes': content.vote_count?.toString() || '0',
    },
  };
}

/**
 * توليد JSON-LD Schema للفيلم
 * يولد SEO ديناميكياً
 */
export function generateMovieSchema(content: SEOContent) {
  const seoData = generateCompleteSEO(content);
  const keywords = seoData.seo_keywords;

  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: content.title_ar,
    alternateName: content.title_en,
    description: content.overview_ar || '',
    image: content.poster_path 
      ? `https://image.tmdb.org/t/p/w1280${content.poster_path}`
      : undefined,
    datePublished: content.release_date,
    keywords: keywords.join(', '),
    aggregateRating: content.vote_average ? {
      '@type': 'AggregateRating',
      ratingValue: content.vote_average,
      ratingCount: content.vote_count || 0,
      bestRating: 10,
      worstRating: 0,
    } : undefined,
    genre: content.primary_genre,
    inLanguage: 'ar',
    url: seoData.canonical_url,
  };
}

/**
 * توليد JSON-LD Schema للمسلسل
 * يولد SEO ديناميكياً
 */
export function generateTVSeriesSchema(content: SEOContent) {
  const seoData = generateCompleteSEO(content);
  const keywords = seoData.seo_keywords;

  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: content.title_ar,
    alternateName: content.title_en,
    description: content.overview_ar || '',
    image: content.poster_path 
      ? `https://image.tmdb.org/t/p/w1280${content.poster_path}`
      : undefined,
    datePublished: content.first_air_date,
    keywords: keywords.join(', '),
    aggregateRating: content.vote_average ? {
      '@type': 'AggregateRating',
      ratingValue: content.vote_average,
      ratingCount: content.vote_count || 0,
      bestRating: 10,
      worstRating: 0,
    } : undefined,
    genre: content.primary_genre,
    inLanguage: 'ar',
    url: seoData.canonical_url,
  };
}

/**
 * مكون Schema.org للفيلم
 */
export function MovieSchema({ content }: { content: SEOContent }) {
  const schema = generateMovieSchema(content);
  
  return (
    <script
      type={'application/ld+json'}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * مكون Schema.org للمسلسل
 */
export function TVSeriesSchema({ content }: { content: SEOContent }) {
  const schema = generateTVSeriesSchema(content);
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
