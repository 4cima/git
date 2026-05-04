import type { GenreOption } from '../types/genre'

export const getFallbackGenres = (contentType?: string, lang?: string): GenreOption[] => {
  return [
    { value: 'action', labelAr: 'أكشن', labelEn: 'Action' },
    { value: 'comedy', labelAr: 'كوميديا', labelEn: 'Comedy' },
    { value: 'drama', labelAr: 'درامي', labelEn: 'Drama' },
    { value: 'horror', labelAr: 'رعب', labelEn: 'Horror' },
    { value: 'romance', labelAr: 'رومانسي', labelEn: 'Romance' },
  ]
}
