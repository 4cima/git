import { useLang } from '../state/useLang'
import { resolveTitleWithFallback } from '../lib/translation'

interface TripleTitlesResult {
  arabic: string | null
  english: string | null
  original: string | null
  primary: string
  hasMultipleTitles: boolean
}

export const useTripleTitles = (content: any): TripleTitlesResult => {
  const { lang } = useLang()

  const cleanText = (value: any) => (typeof value === 'string' ? value.trim() : '')
  const pickFirst = (...values: unknown[]) => values.map(cleanText).find(Boolean) || ''

  // Extract all 3 titles
  const arTitle = pickFirst(
    content?.title_ar,
    content?.name_ar,
    content?.translated_title_ar
  )
  
  const enTitle = pickFirst(
    content?.title_en,
    content?.name_en,
    content?.translated_title_en
  )
  
  const originalTitle = pickFirst(
    content?.original_title,
    content?.original_name
  )

  // Fallback mechanism
  const fallbackTitle = resolveTitleWithFallback(content)
  const fallbackAr = 'بدون عنوان'
  const fallbackEn = 'Untitled'

  // Determine primary title based on language
  let primary: string
  if (lang === 'ar') {
    primary = arTitle || enTitle || originalTitle || fallbackTitle || fallbackAr
  } else {
    primary = enTitle || arTitle || originalTitle || fallbackTitle || fallbackEn
  }

  // ONLY show Arabic + English (never show original language)
  const normalizedEnglish = enTitle && enTitle !== arTitle ? enTitle : null

  // Count distinct titles (only Arabic + English)
  const distinctTitles = [
    arTitle || null,
    normalizedEnglish
  ].filter(Boolean)

  return {
    arabic: arTitle || null,
    english: normalizedEnglish,
    original: originalTitle || null, // Keep for keywords usage
    primary,
    hasMultipleTitles: distinctTitles.length > 1
  }
}
