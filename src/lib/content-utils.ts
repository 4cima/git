// Content utilities for genre translation and country detection
import { getMediaTypeColor as getMediaTypeColorScheme } from '@/utils/genreColors'
import { translateGenre, GENRE_TRANSLATIONS } from './genre-translations'

export { translateGenre, GENRE_TRANSLATIONS }

export const COUNTRY_TRANSLATIONS: Record<string, string> = {
  'US': 'أمريكي',
  'GB': 'بريطاني',
  'FR': 'فرنسي',
  'DE': 'ألماني',
  'IT': 'إيطالي',
  'ES': 'إسباني',
  'TR': 'تركي',
  'KR': 'كوري',
  'JP': 'ياباني',
  'IN': 'هندي',
  'EG': 'مصري',
  'SA': 'سعودي',
  'AE': 'إماراتي',
  'LB': 'لبناني',
  'SY': 'سوري',
  'IQ': 'عراقي',
  'JO': 'أردني',
  'MA': 'مغربي',
  'TN': 'تونسي',
  'DZ': 'جزائري'
}

export function getCountryLabel(originalLanguage: string, productionCountries?: string[]): string {
  // Check production countries first
  if (productionCountries && productionCountries.length > 0) {
    const country = productionCountries[0]
    if (COUNTRY_TRANSLATIONS[country]) {
      return COUNTRY_TRANSLATIONS[country]
    }
  }
  
  // Fallback to language detection
  const languageMap: Record<string, string> = {
    'en': 'أجنبي',
    'ar': 'عربي',
    'tr': 'تركي',
    'ko': 'كوري',
    'ja': 'ياباني',
    'hi': 'هندي',
    'fr': 'فرنسي',
    'de': 'ألماني',
    'it': 'إيطالي',
    'es': 'إسباني'
  }
  
  return languageMap[originalLanguage] || 'أجنبي'
}

export function getMediaTypeLabel(mediaType: string): string {
  const scheme = getMediaTypeColorScheme(mediaType)
  return scheme.label
}

export function getMediaTypeColor(mediaType: string): string {
  const scheme = getMediaTypeColorScheme(mediaType)
  return scheme.text
}
