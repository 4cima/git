// Content utilities for genre translation and country detection

export const GENRE_TRANSLATIONS: Record<string, string> = {
  'Action': 'أكشن',
  'Adventure': 'مغامرة',
  'Animation': 'رسوم متحركة',
  'Comedy': 'كوميدي',
  'Crime': 'جريمة',
  'Documentary': 'وثائقي',
  'Drama': 'دراما',
  'Family': 'عائلي',
  'Fantasy': 'فانتازيا',
  'History': 'تاريخي',
  'Horror': 'رعب',
  'Music': 'موسيقى',
  'Mystery': 'غموض',
  'Romance': 'رومانسي',
  'Science Fiction': 'خيال علمي',
  'Thriller': 'إثارة',
  'War': 'حرب',
  'Western': 'غربي'
}

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

export function translateGenre(genre: string): string {
  return GENRE_TRANSLATIONS[genre] || genre
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
  return mediaType === 'tv' || mediaType === 'series' ? 'مسلسل' : 'فيلم'
}

export function getMediaTypeColor(mediaType: string): string {
  return mediaType === 'tv' || mediaType === 'series' ? 'text-purple-400' : 'text-cyan-400'
}
