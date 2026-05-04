/**
 * Centralized Genre Translations
 * Used across the entire application for consistent genre display
 */

export const GENRE_TRANSLATIONS: Record<string, string> = {
    // Single genres
    'action': 'أكشن',
    'adventure': 'مغامرات',
    'animation': 'رسوم متحركة',
    'comedy': 'كوميدي',
    'crime': 'جريمة',
    'documentary': 'وثائقي',
    'drama': 'دراما',
    'family': 'عائلي',
    'fantasy': 'خيال',
    'history': 'تاريخي',
    'horror': 'رعب',
    'music': 'موسيقي',
    'mystery': 'غموض',
    'romance': 'رومانسي',
    'science fiction': 'خيال علمي',
    'sci-fi': 'خيال علمي',
    'thriller': 'إثارة',
    'war': 'حرب',
    'western': 'غربي',
    'kids': 'أطفال',

    // TV-specific genres
    'soap': 'دراما اجتماعية',
    'talk': 'حواري',
    'news': 'أخبار',
    'reality': 'واقعي',

    // Combined genres (common in TV series)
    'action & adventure': 'أكشن ومغامرات',
    'sci-fi & fantasy': 'خيال علمي وفانتازيا',
    'war & politics': 'حرب وسياسة',
}

/**
 * Translate a genre name to Arabic
 * @param genre - Genre name in English (case-insensitive)
 * @param lang - Target language ('ar' or 'en')
 * @returns Translated genre name or original if translation not found
 */
export function translateGenre(genre: string | null | undefined, lang: string = 'ar'): string {
    if (!genre || lang !== 'ar') return genre || ''

    const normalized = genre.toLowerCase().trim()
    return GENRE_TRANSLATIONS[normalized] || genre
}

/**
 * Translate multiple genres
 * @param genres - Array of genre names
 * @param lang - Target language
 * @returns Array of translated genre names
 */
export function translateGenres(genres: (string | null | undefined)[], lang: string = 'ar'): string[] {
    return genres
        .filter((g): g is string => Boolean(g))
        .map(g => translateGenre(g, lang))
}
