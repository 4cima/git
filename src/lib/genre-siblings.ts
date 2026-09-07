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
 * TMDB لا يوسم المسلسلات بـ Thriller (53) أو Horror (27) أبدًا (0 مسلسل في القاعدة
 * يحمل أيًّا منهما) — مسلسلات الإثارة/الرعب تُصنَّف Mystery (9648) أو Crime (80).
 * لذا تُترجم هاتان الفئتان إلى أقرب تصنيف تلفزيوني، وللمسلسلات فقط
 * (حتى لا تتلوث صفحة أفلام الإثارة/الرعب بمحتوى الغموض).
 *
 * مهم: الترجمان مختلف عمدًا حتى لا تتطابق صفحتا thriller و horror:
 *   - thriller → Mystery + Crime (جريمة وإثارة)
 *   - horror   → Mystery فقط مع استبعاد Crime (انظر GENRE_TV_EXCLUSIONS)
 *     فينتج قائمة "غموض خارق للطبيعة" مختلفة تمامًا عن صفحة الإثارة.
 */
export const GENRE_TV_SIBLINGS: Record<number, number[]> = {
  53: [9648, 80], // Thriller → Mystery + Crime
  27: [9648]      // Horror   → Mystery (بدون Crime — عبر الاستبعاد أدناه)
}

/**
 * استبعادات TV: بعد ترجمان النوع لأنواعه التلفزيونية، تُستبعد هذه الأنواع
 * من نتيجة المسلسلات. السبب الوحيد حاليًا: Horror (27) يستبعد Crime (80)
 * حتى لا تكون صفحة الرعب نسخة من صفحة الإثارة (كلاهما mystery).
 */
export const GENRE_TV_EXCLUSIONS: Record<number, number[]> = {
  27: [80] // Horror (TV) = Mystery بدون Crime
}

/** أرقام الأنواع التي يجب استبعادها من نتائج المسلسلات لنوعٍ معيّن */
export function getTvGenreExclusions(genreId: number): number[] {
  return GENRE_TV_EXCLUSIONS[genreId] || []
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

/**
 * Build SQL clause excluding rows whose genres_json contains any of excludedIds.
 * يُستخدم مع getTvGenreExclusions لتفريق قوائم المسلسلات المتقاربة
 * (horror بدون crime). يُرجع 1=1 عندما لا توجد استبعادات.
 */
export function buildGenreExclusionClause(excludedIds: number[], tableAlias: string = ''): string {
  if (excludedIds.length === 0) return '1=1'
  const prefix = tableAlias ? `${tableAlias}.` : ''
  const conditions = excludedIds.map(() => `${prefix}genres_json NOT LIKE ?`).join(' AND ')
  return `(${conditions})`
}

/**
 * Parameter array for buildGenreExclusionClause — نفس صيغة المطابقة
 * المستخدمة في buildGenreParams ("%\"tmdb_id\":ID%")
 */
export function buildGenreExclusionParams(excludedIds: number[]): string[] {
  return excludedIds.map(id => `%"tmdb_id":${id}%`)
}
