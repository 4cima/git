const GENRE_TRANSLATIONS = {
  'Action': 'أكشن',
  'Adventure': 'مغامرة',
  'Animation': 'رسوم متحركة',
  'Comedy': 'كوميديا',
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
  'TV Movie': 'فيلم تلفزيوني',
  'Thriller': 'إثارة',
  'War': 'حرب',
  'Western': 'غربي',
  // خاصة بالمسلسلات (TV genres مختلفة شوية عن Movies في TMDB)
  'Action & Adventure': 'أكشن ومغامرة',
  'Kids': 'أطفال',
  'News': 'أخبار',
  'Reality': 'واقعي',
  'Sci-Fi & Fantasy': 'خيال علمي وفانتازيا',
  'Soap': 'دراما اجتماعية',
  'Talk': 'برنامج حواري',
  'War & Politics': 'حرب وسياسة',
};

function getGenreNameAr(nameEn) {
  return GENRE_TRANSLATIONS[nameEn] || null;
}

module.exports = { GENRE_TRANSLATIONS, getGenreNameAr };
