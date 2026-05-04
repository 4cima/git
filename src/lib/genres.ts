// Genre utilities for Next.js

export function getGenreName(genreId: number, lang: string = 'ar'): string {
  const genres: Record<number, { ar: string; en: string }> = {
    28: { ar: 'أكشن', en: 'Action' },
    12: { ar: 'مغامرة', en: 'Adventure' },
    16: { ar: 'أنمي', en: 'Animation' },
    35: { ar: 'كوميدي', en: 'Comedy' },
    80: { ar: 'جريمة', en: 'Crime' },
    99: { ar: 'وثائقي', en: 'Documentary' },
    18: { ar: 'دراما', en: 'Drama' },
    10751: { ar: 'عائلي', en: 'Family' },
    14: { ar: 'فانتازيا', en: 'Fantasy' },
    36: { ar: 'تاريخي', en: 'History' },
    27: { ar: 'رعب', en: 'Horror' },
    10402: { ar: 'موسيقي', en: 'Music' },
    9648: { ar: 'غموض', en: 'Mystery' },
    10749: { ar: 'رومانسي', en: 'Romance' },
    878: { ar: 'خيال علمي', en: 'Science Fiction' },
    10770: { ar: 'تلفزيوني', en: 'TV Movie' },
    53: { ar: 'إثارة', en: 'Thriller' },
    10752: { ar: 'حرب', en: 'War' },
    37: { ar: 'غربي', en: 'Western' },
  }

  const genre = genres[genreId]
  if (!genre) return ''
  
  return lang === 'ar' ? genre.ar : genre.en
}
