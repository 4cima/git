import React from 'react';
import styles from './UnifiedFilters.module.css';

/* (E-5) contentType يقتصر على أنواع المحتوى الموجودة فعلاً في الموقع.
   'gaming' و 'software' حُذفا من النوع: لا صفحة ولا API ولا جدول لهما
   (المستخدم الوحيد لهذا المكوّن هو CategoryHub ويمرّر 'movies' | 'series' فقط).
   ومعهما حُذفت 13 سلاجاً وهمياً + واجهتا «المنصة» و«نظام التشغيل» اللتان كانتا لهما فقط. */
export type ContentType = 'movies' | 'series' | 'anime';

export interface UnifiedFiltersProps {
  contentType: ContentType;
  genre?: string | null;
  year?: number | string | null;
  rating?: number | null;
  language?: string | null;
  categoryFilter?: string | null;
  onApplyFilters: (filters: {
    genre?: string | null;
    year?: string | null;
    rating?: number | null;
    language?: string | null;
  }) => void;
  onClearAll: () => void;
  lang?: 'ar' | 'en';
}

const GENRE_OPTIONS: Record<ContentType, { value: string; labelAr: string; labelEn: string }[]> = {
  movies: [
    { value: 'action', labelAr: 'أكشن', labelEn: 'Action' },
    { value: 'comedy', labelAr: 'كوميديا', labelEn: 'Comedy' },
    { value: 'drama', labelAr: 'دراما', labelEn: 'Drama' },
    { value: 'horror', labelAr: 'رعب', labelEn: 'Horror' },
    { value: 'romance', labelAr: 'رومانسي', labelEn: 'Romance' },
    { value: 'thriller', labelAr: 'إثارة', labelEn: 'Thriller' },
    { value: 'science-fiction', labelAr: 'خيال علمي', labelEn: 'Sci-Fi' },
    { value: 'animation', labelAr: 'رسوم متحركة', labelEn: 'Animation' }
  ],
  /* ⚠️ سلاجات D1 الحقيقية بصيغة شرطية (action-adventure=10759، sci-fi-fantasy=10765) —
     تحقق حي 2026-09-16. صيغة الـ«&» غير موجودة في D1 ⇒ قائمة فارغة صامتة. */
  series: [
    { value: 'drama', labelAr: 'دراما', labelEn: 'Drama' },
    { value: 'comedy', labelAr: 'كوميديا', labelEn: 'Comedy' },
    { value: 'action-adventure', labelAr: 'أكشن ومغامرة', labelEn: 'Action & Adventure' },
    { value: 'mystery', labelAr: 'غموض', labelEn: 'Mystery' },
    { value: 'romance', labelAr: 'رومانسي', labelEn: 'Romance' },
    { value: 'crime', labelAr: 'جريمة', labelEn: 'Crime' },
    { value: 'sci-fi-fantasy', labelAr: 'خيال علمي وفانتازيا', labelEn: 'Sci-Fi & Fantasy' }
  ],
  /* (E-5) كانت هنا قائمتان وهميتان: gaming (7 سلاجات) و software (6 سلاجات) —
     مجموعها 13 سلاجاً لا يقابلها أي contentType ولا أي جدول في الموقع. حُذفت كلها. */
  anime: [
    { value: 'action', labelAr: 'أكشن', labelEn: 'Action' },
    { value: 'adventure', labelAr: 'مغامرات', labelEn: 'Adventure' },
    { value: 'comedy', labelAr: 'كوميديا', labelEn: 'Comedy' },
    { value: 'drama', labelAr: 'دراما', labelEn: 'Drama' },
    { value: 'fantasy', labelAr: 'فانتازيا', labelEn: 'Fantasy' },
    { value: 'romance', labelAr: 'رومانسي', labelEn: 'Romance' }
  ]
};

const LANGUAGE_OPTIONS = [
  { value: 'ar', labelAr: 'عربي', labelEn: 'Arabic' },
  { value: 'en', labelAr: 'إنجليزي', labelEn: 'English' },
  { value: 'ko', labelAr: 'كوري', labelEn: 'Korean' },
  { value: 'tr', labelAr: 'تركي', labelEn: 'Turkish' },
  { value: 'zh', labelAr: 'صيني', labelEn: 'Chinese' },
  { value: 'ja', labelAr: 'ياباني', labelEn: 'Japanese' },
  { value: 'hi', labelAr: 'هندي', labelEn: 'Hindi' },
  { value: 'es', labelAr: 'إسباني', labelEn: 'Spanish' },
  { value: 'fr', labelAr: 'فرنسي', labelEn: 'French' }
];

/* (E-5) PLATFORM_OPTIONS و OS_OPTIONS حُذفتا: كانتا تظهران لـcontentType='gaming'/'software' فقط
   (نوعان غير موجودين في الموقع) ⇒ لا مستخدم لهما بعد حذف الواجهتين. */

const RATING_OPTIONS = [
  { value: 10, labelAr: '10 ممتاز', labelEn: '10 Excellent' },
  { value: 9, labelAr: '9 ممتاز', labelEn: '9 Excellent' },
  { value: 8, labelAr: '8 جيد جداً', labelEn: '8 Very Good' },
  { value: 7, labelAr: '7 جيد', labelEn: '7 Good' },
  { value: 6, labelAr: '6 مقبول', labelEn: '6 Fair' },
  { value: 5, labelAr: '5 متوسط', labelEn: '5 Average' },
  { value: 4, labelAr: '4 ضعيف', labelEn: '4 Below Average' },
  { value: 3, labelAr: '3 ضعيف', labelEn: '3 Poor' },
  { value: 2, labelAr: '2 سيء', labelEn: '2 Bad' },
  { value: 1, labelAr: '1 سيء جداً', labelEn: '1 Very Bad' }
];

export const UnifiedFilters: React.FC<UnifiedFiltersProps> = ({
  contentType,
  genre,
  year,
  rating,
  language,
  categoryFilter,
  onApplyFilters,
  onClearAll,
  lang = 'ar'
}) => {
  const isArabic = lang === 'ar';
  
  const [localGenre, setLocalGenre] = React.useState(genre || '');
  const [localYear, setLocalYear] = React.useState(String(year || ''));
  const [localRating, setLocalRating] = React.useState(rating || '');
  const [localLanguage, setLocalLanguage] = React.useState(language || '');
  
  React.useEffect(() => {
    setLocalGenre(genre || '');
    setLocalYear(String(year || ''));
    setLocalRating(rating || '');
    setLocalLanguage(language || '');
  }, [genre, year, rating, language]);
  
  const handleApply = () => {
    onApplyFilters({
      genre: localGenre || null,
      year: localYear || null,
      rating: localRating ? Number(localRating) : null,
      language: localLanguage || null,
    });
  };
  
  const handleClear = () => {
    setLocalGenre('');
    setLocalYear('');
    setLocalRating('');
    setLocalLanguage('');
    onClearAll();
  };
  
  if (categoryFilter === 'plays') {
    return null;
  }
  
  const genreOptions = GENRE_OPTIONS[contentType] || [];
  const currentYear = new Date().getFullYear();
  const yearOptions: Array<{ value: string; label: string }> = [];
  
  for (let y = currentYear; y >= 2021; y--) {
    yearOptions.push({ value: String(y), label: String(y) });
  }
  
  yearOptions.push({ value: '2010-2020', label: isArabic ? '2010-2020' : '2010-2020' });
  yearOptions.push({ value: '2000-2009', label: isArabic ? 'الألفينات (2000-2009)' : '2000s (2000-2009)' });
  
  /* (E-5) الفروع الكلاسيكية (1990 وما قبلها) صارت بلا شرط: شرط الاستثناء كان لـgaming/software فقط */
  yearOptions.push({ value: '1990-1999', label: isArabic ? 'التسعينات (1990-1999)' : '1990s (1990-1999)' });
  yearOptions.push({ value: '1980-1989', label: isArabic ? 'الثمانينات (1980-1989)' : '1980s (1980-1989)' });
  yearOptions.push({ value: '1970-1979', label: isArabic ? 'السبعينات (1970-1979)' : '1970s (1970-1979)' });
  yearOptions.push({ value: '1960-1969', label: isArabic ? 'الستينات (1960-1969)' : '1960s (1960-1969)' });
  yearOptions.push({ value: '1950-1959', label: isArabic ? 'الخمسينات (1950-1959)' : '1950s (1950-1959)' });
  
  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-4 mb-8 backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Genre Filter */}
        <div className="space-y-2">
          <label htmlFor="genre-filter" className="text-sm font-medium text-zinc-400">
            {isArabic ? 'النوع' : 'Genre'}
          </label>
          <select
            id="genre-filter"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
            value={localGenre}
            onChange={(e) => setLocalGenre(e.target.value)}
          >
            <option value="">{isArabic ? 'كل الأنواع' : 'All Genres'}</option>
            {genreOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {isArabic ? option.labelAr : option.labelEn}
              </option>
            ))}
          </select>
        </div>
        
        {/* Year Filter */}
        <div className="space-y-2">
          <label htmlFor="year-filter" className="text-sm font-medium text-zinc-400">
            {isArabic ? 'السنة' : 'Year'}
          </label>
          <select
            id="year-filter"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
            value={localYear}
            onChange={(e) => setLocalYear(e.target.value)}
          >
            <option value="">{isArabic ? 'كل السنوات' : 'All Years'}</option>
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Rating Filter */}
        <div className="space-y-2">
          <label htmlFor="rating-filter" className="text-sm font-medium text-zinc-400">
            {isArabic ? 'التقييم' : 'Rating'}
          </label>
          <select
            id="rating-filter"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
            value={localRating}
            onChange={(e) => setLocalRating(e.target.value)}
          >
            <option value="">{isArabic ? 'كل التقييمات' : 'All Ratings'}</option>
            {RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {isArabic ? option.labelAr : option.labelEn}
              </option>
            ))}
          </select>
        </div>
        
        {/* فلتر اللغة — (E-5) حُذف فرعا «المنصة» (gaming) و«نظام التشغيل» (software): نوعان غير موجودين في الموقع */}
        <div className="space-y-2">
          <label htmlFor="language-filter" className="text-sm font-medium text-zinc-400">
            {isArabic ? 'اللغة' : 'Language'}
          </label>
          <select
            id="language-filter"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
            value={localLanguage}
            onChange={(e) => setLocalLanguage(e.target.value)}
          >
            <option value="">{isArabic ? 'كل اللغات' : 'All Languages'}</option>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {isArabic ? option.labelAr : option.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-white/5">
        <button
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          onClick={handleClear}
        >
          {isArabic ? 'مسح الفلاتر' : 'Clear Filters'}
        </button>
        <button
          className="px-8 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 text-black hover:bg-cyan-400 hover:scale-105 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          onClick={handleApply}
        >
          {isArabic ? 'تطبيق الفلاتر' : 'Apply Filters'}
        </button>
      </div>
    </div>
  );
};

export default UnifiedFilters;