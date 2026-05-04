/**
 * Translates genre names from English to Arabic
 * If already in Arabic, returns as is
 */
export const translateGenre = (genreEn: string): string => {
  const genreMap: Record<string, string> = {
    'Action': 'أكشن',
    'ACTION': 'أكشن',
    'Adventure': 'مغامرة',
    'ADVENTURE': 'مغامرة',
    'Animation': 'رسوم متحركة',
    'ANIMATION': 'رسوم متحركة',
    'Comedy': 'كوميديا',
    'COMEDY': 'كوميديا',
    'Crime': 'جريمة',
    'CRIME': 'جريمة',
    'Documentary': 'وثائقي',
    'DOCUMENTARY': 'وثائقي',
    'Drama': 'دراما',
    'DRAMA': 'دراما',
    'Family': 'عائلي',
    'FAMILY': 'عائلي',
    'Fantasy': 'فانتازيا',
    'FANTASY': 'فانتازيا',
    'History': 'تاريخي',
    'HISTORY': 'تاريخي',
    'Horror': 'رعب',
    'HORROR': 'رعب',
    'Music': 'موسيقى',
    'MUSIC': 'موسيقى',
    'Mystery': 'غموض',
    'MYSTERY': 'غموض',
    'Romance': 'رومانسي',
    'ROMANCE': 'رومانسي',
    'Science Fiction': 'خيال علمي',
    'SCIENCE FICTION': 'خيال علمي',
    'Sci-Fi': 'خيال علمي',
    'SCI-FI': 'خيال علمي',
    'Thriller': 'إثارة',
    'THRILLER': 'إثارة',
    'War': 'حرب',
    'WAR': 'حرب',
    'Western': 'غربي',
    'WESTERN': 'غربي'
  }
  
  // If already in Arabic, return as is
  if (/[\u0600-\u06FF]/.test(genreEn)) {
    return genreEn
  }
  
  return genreMap[genreEn] || genreMap[genreEn.toUpperCase()] || genreEn
}
