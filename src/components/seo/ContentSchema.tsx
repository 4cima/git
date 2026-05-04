'use client'

import { MovieSchema, TVSeriesSchema, SEOContent } from '@/lib/seo-helpers'

interface ContentSchemaProps {
  content: SEOContent
  type: 'movie' | 'series'
}

/**
 * مكون Schema.org للأفلام والمسلسلات
 * يضاف في صفحات التفاصيل لتحسين SEO
 */
export function ContentSchema({ content, type }: ContentSchemaProps) {
  if (type === 'movie') {
    return <MovieSchema content={content} />
  }
  
  return <TVSeriesSchema content={content} />
}
