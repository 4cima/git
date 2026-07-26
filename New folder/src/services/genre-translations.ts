export const GENRE_TRANSLATIONS: Record<string, string> = {
  'Action': 'أكشن',
  'Adventure': 'مغامرة',
  'Animation': 'رسوم متحركة',
  'Comedy': 'كوميديا',
  'Crime': 'جريمة',
  'Documentary': 'وثائقي',
  'Drama': 'دراما',
  'Family': 'عائلي',
  'Fantasy': 'خيال',
  'History': 'تاريخي',
  'Horror': 'رعب',
  'Music': 'موسيقى',
  'Mystery': 'غموض',
  'Romance': 'رومانسي',
  'Science Fiction': 'خيال علمي',
  'TV Movie': 'فيلم تلفزيوني',
  'Thriller': 'إثارة',
  'War': 'حرب',
  'Western': 'غربي',
  // TV genres
  'Action & Adventure': 'أكشن ومغامرة',
  'Kids': 'أطفال',
  'News': 'أخبار',
  'Reality': 'واقعي',
  'Sci-Fi & Fantasy': 'خيال علمي وخيال',
  'Soap': 'دراما اجتماعية',
  'Talk': 'برنامج حواري',
  'War & Politics': 'حرب وسياسة',
};

export function getGenreNameAr(nameEn: string): string {
  return GENRE_TRANSLATIONS[nameEn] || nameEn;
}
