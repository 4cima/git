import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const dynamic = 'force-dynamic'

/**
 * GET /api/home-sections — بيانات الأقسام الإضافية للصفحة الرئيسية
 * (الخيال العلمي + الأنمي + الجريمة + العربي) في استجابة واحدة.
 *
 * تُحمَّل من الكلاينت بعد أول رسم (lazy) بدل إرسالها مع HTML الصفحة —
 * يقلّص حجم HTML الرئيسي من ~930KB إلى ~450KB مع بقاء الرائج والـSEO سليمين.
 *
 * كاش مزدوج: كاش الذاكرة 30 دقيقة (الجداول تتغير مرة يومياً) + s-maxage للـCDN.
 */

const HOME_SECTIONS_TTL_MS = 30 * 60 * 1000

/** أقل سنة مسموحة — لا يُعرض عمل أقدم من 10 سنوات */
const MIN_YEAR = new Date().getFullYear() - 10

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
 * كل القيم مربوطة (?) — ممنوع دمج القيم مباشرة في SQL.
 */
function genreQuery(movieGenreIds: number[], seriesGenreIds: number[], limit = 100): { sql: string; params: (number)[] } {
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
  const params = [...movieGenreIds, MIN_YEAR, half, ...seriesGenreIds, MIN_YEAR, half]
  return { sql, params }
}

interface HomeSectionsData {
  sciFi: unknown[]
  anime: unknown[]
  crime: unknown[]
  arabicMovies: unknown[]
  arabicSeries: unknown[]
}

let sectionsCache: { at: number; data: HomeSectionsData } | null = null

/* eslint-disable @typescript-eslint/no-explicit-any */
const sanitize = (rows: any[]) => rows.map((r) => JSON.parse(JSON.stringify(r)))

async function getHomeSections(): Promise<HomeSectionsData> {
  if (sectionsCache && Date.now() - sectionsCache.at < HOME_SECTIONS_TTL_MS) {
    return sectionsCache.data
  }
  try {
    /* استعلامات جاهزة بقيم مربوطة (?) */
    const sciFiQ = genreQuery([878], [10765])
    const animeQ = genreQuery([16], [16])
    const crimeQ = genreQuery([80, 9648], [80, 9648])
    const arabicMoviesSql = `
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
    const arabicSeriesSql = `
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
    const arabicParams = [MIN_YEAR, 50]

    const [sciFi, anime, crime, arabicMovies, arabicSeries] = await Promise.all([
      /* الخيال العلمي — مختلط (أفلام + مسلسلات) */
      executeAll(sciFiQ.sql, sciFiQ.params),
      /* الأنمي والرسوم المتحركة — مختلط */
      executeAll(animeQ.sql, animeQ.params),
      /* الجريمة والغموض — مختلط */
      executeAll(crimeQ.sql, crimeQ.params),
      /* أفلام عربية — آخر 10 سنوات فقط */
      executeAll(arabicMoviesSql, arabicParams),
      /* مسلسلات عربية — آخر 10 سنوات فقط */
      executeAll(arabicSeriesSql, arabicParams),
    ])

    // فلتر مركزي: يستبعد Talk Show + War & Politics + Documentary + History
    const data: HomeSectionsData = {
      sciFi: filterExcludedGenres(sanitize(sciFi)),
      anime: filterExcludedGenres(sanitize(anime)),
      crime: filterExcludedGenres(sanitize(crime)),
      arabicMovies: filterExcludedGenres(sanitize(arabicMovies)),
      arabicSeries: filterExcludedGenres(sanitize(arabicSeries)),
    }
    sectionsCache = { at: Date.now(), data }
    return data
  } catch (error) {
    console.error('Error fetching home sections:', error)
    return { sciFi: [], anime: [], crime: [], arabicMovies: [], arabicSeries: [] }
  }
}

export async function GET() {
  const data = await getHomeSections()
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  })
}
