import { executeAll } from '@/lib/db'

/**
 * استعلامات أقسام الصفحة الرئيسية المشتركة بين:
 * - src/app/page.tsx (SSR — Googlebot يرى الأقسام في HTML الأول)
 * - src/app/api/home-sections/route.ts (تحيين كلاينت-سايد للصفحات المخزّنة)
 *
 * كل القيم مربوطة (?) — ممنوع دمج القيم مباشرة في SQL.
 */

/** أقل سنة مسموحة — لا يُعرض عمل أقدم من 10 سنوات */
export const HOME_SECTIONS_MIN_YEAR = new Date().getFullYear() - 10

/* أعمدة موحّدة لجداول كاش الأفلام */
const MOVIE_GENRE_FIELDS = `
  'movie' AS media_type, l.id, l.tmdb_id, l.slug,
  l.title_ar, l.title_en, l.poster_path, l.backdrop_path,
  l.vote_average, l.release_year AS year, l.overview_ar, l.genres_json`

/* أعمدة موحّدة لجداول كاش المسلسلات */
const SERIES_GENRE_FIELDS = `
  'tv' AS media_type, s.id, s.tmdb_id, s.slug,
  s.name_ar AS title_ar, s.name_en AS title_en, s.poster_path, s.backdrop_path,
  s.vote_average, s.first_air_year AS year, s.overview_ar, s.genres_json`

/**
 * استعلام قسم تصنيف من جداول كاش التصنيفات (list_movies_genre + list_series_genre)
 * — 50 فيلم + 50 مسلسل (لكل فرع حدّه الخاص حتى لا يبتلع أحد الطرفين النتائج كلها،
 * ثم يتداخل الكلاينت الكروت: فيلم/مسلسل/فيلم...) + لا أعمال أقدم من 10 سنوات.
 */
export function homeSectionGenreQuery(
  movieGenreIds: number[],
  seriesGenreIds: number[],
  limit = 100
): { sql: string; params: number[] } {
  const half = Math.floor(limit / 2)
  const moviePlaceholders = movieGenreIds.map(() => '?').join(',')
  const seriesPlaceholders = seriesGenreIds.map(() => '?').join(',')
  const sql = `
    SELECT * FROM (
      SELECT ${MOVIE_GENRE_FIELDS}
      FROM list_movies_genre l
      WHERE l.genre_tmdb_id IN (${moviePlaceholders})
        AND l.release_year >= ?
      ORDER BY l.popularity DESC
      LIMIT ?
    )
    UNION ALL
    SELECT * FROM (
      SELECT ${SERIES_GENRE_FIELDS}
      FROM list_series_genre s
      WHERE s.genre_tmdb_id IN (${seriesPlaceholders})
        AND s.first_air_year >= ?
      ORDER BY s.popularity DESC
      LIMIT ?
    )`
  const params = [...movieGenreIds, HOME_SECTIONS_MIN_YEAR, half, ...seriesGenreIds, HOME_SECTIONS_MIN_YEAR, half]
  return { sql, params }
}

/** استعلام الأفلام العربية (أحدث 50) */
export const ARABIC_MOVIES_SQL = `
  SELECT 'movie' AS media_type, m.id, m.tmdb_id, m.slug,
          m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
          m.vote_average, m.release_year AS year, m.overview_ar, m.genres_json
   FROM movies m
   WHERE m.original_language = 'ar'
     AND (m.filter_status IN ('clean', 'reviewed_approved') OR m.filter_status IS NULL)
     AND m.slug IS NOT NULL AND m.tmdb_id IS NOT NULL
     AND m.release_year >= ?
   ORDER BY m.popularity DESC
   LIMIT ?`

/** استعلام المسلسلات العربية (أحدث 50) */
export const ARABIC_SERIES_SQL = `
  SELECT 'tv' AS media_type, s.id, s.tmdb_id, s.slug,
          s.name_ar AS title_ar, s.name_en AS title_en, s.poster_path, s.backdrop_path,
          s.vote_average, s.first_air_year AS year, s.overview_ar, s.genres_json
   FROM tv_series s
   WHERE s.original_language = 'ar'
     AND (s.filter_status IN ('clean', 'reviewed_approved') OR s.filter_status IS NULL)
     AND s.slug IS NOT NULL AND s.tmdb_id IS NOT NULL
     AND s.first_air_year >= ?
   ORDER BY s.popularity DESC
   LIMIT ?`

export const ARABIC_LIST_PARAMS = [HOME_SECTIONS_MIN_YEAR, 50]

/** جلب بيانات الأقسام الأربعة دفعة واحدة (SSR + API) */
export async function fetchHomeSections(): Promise<{
  sciFi: unknown[]
  anime: unknown[]
  crime: unknown[]
  arabicMovies: unknown[]
  arabicSeries: unknown[]
}> {
  const sciFiQ = homeSectionGenreQuery([878], [10765])
  const animeQ = homeSectionGenreQuery([16], [16])
  const crimeQ = homeSectionGenreQuery([80, 9648], [80, 9648])
  const [sciFi, anime, crime, arabicMovies, arabicSeries] = await Promise.all([
    /* الخيال العلمي — مختلط (أفلام + مسلسلات) */
    executeAll(sciFiQ.sql, sciFiQ.params),
    /* الأنمي والرسوم المتحركة — مختلط */
    executeAll(animeQ.sql, animeQ.params),
    /* الجريمة والغموض — مختلط */
    executeAll(crimeQ.sql, crimeQ.params),
    /* أفلام عربية — آخر 10 سنوات فقط */
    executeAll(ARABIC_MOVIES_SQL, ARABIC_LIST_PARAMS),
    /* مسلسلات عربية — آخر 10 سنوات فقط */
    executeAll(ARABIC_SERIES_SQL, ARABIC_LIST_PARAMS),
  ])
  return { sciFi, anime, crime, arabicMovies, arabicSeries }
}