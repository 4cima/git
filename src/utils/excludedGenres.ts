/**
 * Excluded Genres Utility
 * فلتر موحّد يستبعد المحتوى غير المرغوب من كل أقسام الموقع
 * (Talk Show + War & Politics + Documentary + History)
 *
 * يُستخدم في:
 * - Page-level data fetchers (homepage, movies, series listings)
 * - API routes (/api/home, /api/genres/[slug])
 * - في الـ client كـ safety net
 */

export {}

const EXCLUDED_GENRE_IDS = new Set<number>([
  10767, // Talk Show
  10768, // War & Politics
  99,    // Documentary
  36,    // History (Historical)
])

/** فحص سريع: هل الـ ID موجود في القائمة الممنوعة؟ */
export function isExcludedGenreId(id: number | string | undefined | null): boolean {
  if (id == null) return false
  const n = typeof id === 'string' ? parseInt(id, 10) : id
  return Number.isFinite(n) && EXCLUDED_GENRE_IDS.has(n)
}

/** فحص على صف قاعدة بيانات: حقل genres_json يكون string (JSON) أو object جاهز */
export function hasExcludedGenre(
  genresJson: string | unknown[] | null | undefined
): boolean {
  if (!genresJson) return false
  try {
    const genres =
      typeof genresJson === 'string' ? JSON.parse(genresJson) : genresJson
    if (Array.isArray(genres)) {
      return genres.some((g: { id?: number; tmdb_id?: number } | number) => {
        const id = typeof g === 'number' ? g : g?.id ?? g?.tmdb_id
        return typeof id === 'number' && EXCLUDED_GENRE_IDS.has(id)
      })
    }
  } catch {
    // Silent
  }
  return false
}

/** فلتر جاهز للقوائم: يُرجع العناصر التي لا تنتمي لأي genre ممنوع */
export function filterExcludedGenres<T extends { genres_json?: string | unknown[] | null }>(
  items: readonly T[] | null | undefined
): T[] {
  if (!items || items.length === 0) return []
  return items.filter((item) => !hasExcludedGenre(item.genres_json))
}


/**
 * شرط SQL لاستبعاد المحتوى الممنوع من الاستعلام مباشرة
 * (بنفس صيغة المطابقة المستخدمة في buildGenreParams — "%\"tmdb_id\":ID%")
 *
 * يضمن عدداً ثابتاً لكل صفحة (20 عنصراً) بدلاً من الفلترة بعد الجلب،
 * ويُبقي على filterExcludedGenres في الـ client كـ safety net فقط.
 */
export const EXCLUDED_GENRE_SQL_CLAUSE =
  `(genres_json NOT LIKE '%"tmdb_id":10767%'` + // Talk Show
  ` AND genres_json NOT LIKE '%"tmdb_id":10768%'` + // War & Politics
  ` AND genres_json NOT LIKE '%"tmdb_id":99%'` + // Documentary
  ` AND genres_json NOT LIKE '%"tmdb_id":36%')` // History

/** مصفوفة الـ IDs (للاستخدام في SQL / debugging) */
export const EXCLUDED_GENRE_IDS_LIST: readonly number[] = Array.from(EXCLUDED_GENRE_IDS)
