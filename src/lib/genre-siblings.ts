/**
 * Genre sibling mapping for cross-category content discovery
 * 
 * Maps movie-only genres to their series equivalents and vice versa
 * to provide comprehensive content when browsing by genre.
 */

export const GENRE_SIBLINGS: Record<number, number[]> = {
  // Action (28) ↔ Action & Adventure (10759)
  28: [10759],
  10759: [28, 12], // Also includes Adventure (12)
  
  // Adventure (12) → Action & Adventure (10759)
  12: [10759],
  
  // Fantasy (14) ↔ Sci-Fi & Fantasy (10765)
  14: [10765],
  10765: [14, 878], // Also includes Science Fiction (878)
  
  // Science Fiction (878) → Sci-Fi & Fantasy (10765)
  878: [10765],
  
  // War (10752) ↔ War & Politics (10768)
  10752: [10768],
  10768: [10752]
}

/**
 * TV-specific sibling mapping.
 *
 * TMDB لا يوسم المسلسلات بـ Thriller (53) أو Horror (27) أبدًا —
 * مسلسلات الإثارة/الرعب تُصنَّف Mystery (9648) أو Crime (80).
 * لذا تُترجم هاتان الفئتان إلى أقرب تصنيف تلفزيوني، وللمسلسلات فقط
 * (حتى لا تتلوث صفحة أفلام الإثارة/الرعب بمحتوى الغموض).
 */
export const GENRE_TV_SIBLINGS: Record<number, number[]> = {
  53: [9648], // Thriller → Mystery
  27: [9648]  // Horror   → Mystery
}

/**
 * Get all related genre IDs for a given genre (including the original),
 * merged with TV-specific siblings — استخدمها فقط عند جلب محتوى المسلسلات (type=tv)
 */
export function getGenreWithTvSiblings(genreId: number): number[] {
  const base = getGenreWithSiblings(genreId)
  const tvExtra = GENRE_TV_SIBLINGS[genreId] || []
  return Array.from(new Set([...base, ...tvExtra]))
}

/**
 * Get all related genre IDs for a given genre (including the original)
 */
export function getGenreWithSiblings(genreId: number): number[] {
  const siblings = GENRE_SIBLINGS[genreId] || []
  return [genreId, ...siblings]
}

/**
 * Build SQL WHERE clause for genres_json matching multiple genre IDs
 */
export function buildGenreWhereClause(genreIds: number[], tableAlias: string = ''): string {
  const prefix = tableAlias ? `${tableAlias}.` : ''
  
  if (genreIds.length === 1) {
    return `${prefix}genres_json LIKE ?`
  }
  
  const conditions = genreIds.map(() => `${prefix}genres_json LIKE ?`).join(' OR ')
  return `(${conditions})`
}

/**
 * Get parameter array for genre WHERE clause
 */
export function buildGenreParams(genreIds: number[]): string[] {
  return genreIds.map(id => `%"tmdb_id":${id}%`)
}
