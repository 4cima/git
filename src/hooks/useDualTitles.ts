import { useLang } from '../state/useLang'
import { resolveTitleWithFallback } from '../lib/translation'

/**
 * Enhanced Dual Titles Hook
 * 
 * Display Logic:
 * - Arabic Mode: Arabic (main) + English (sub)
 * - English Mode: English (main) + Arabic (sub)
 * 
 * CRITICAL: Never show original language title if it's not Arabic or English
 */
export const useDualTitles = (movie: any) => {
  const { lang } = useLang()

  const cleanText = (value: any) => (typeof value === 'string' ? value.trim() : '')
  const pickFirst = (...values: unknown[]) => values.map(cleanText).find(Boolean) || ''

  const arTitle = pickFirst(movie?.title_ar, movie?.name_ar, movie?.translated_title_ar)
  const enTitle = pickFirst(movie?.title_en, movie?.name_en, movie?.translated_title_en)
  const originalTitle = pickFirst(movie?.original_title, movie?.original_name)
  const originalLanguage = movie?.original_language || 'en'
  const fallbackTitle = resolveTitleWithFallback(movie)

  const fallbackAr = 'بدون عنوان'
  const fallbackEn = 'Untitled'

  if (lang === 'ar') {
    // Arabic Mode: Show Arabic as main, English as sub
    const main = arTitle || enTitle || fallbackTitle || fallbackAr
    
    // Sub: Show English only (never show non-Arabic/English original)
    const sub = enTitle && enTitle !== main ? enTitle : null
    
    return { main, sub }
  }

  // English Mode: Show English as main, Arabic as sub
  const main = enTitle || fallbackTitle || fallbackEn
  const sub = arTitle && arTitle !== main ? arTitle : null
  return { main, sub }
}
