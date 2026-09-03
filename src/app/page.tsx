import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { HomePageClient } from '@/components/pages/HomePageClient'

export const metadata: Metadata = {
  title: 'فور سيما | شاهد أحدث الأفلام والمسلسلات المترجمة',
  description: 'موقع فور سيما لمشاهدة أحدث الأفلام والمسلسلات المترجمة بجودة عالية - أكشن، دراما، كوميديا، رعب، وأكثر',
  alternates: { canonical: 'https://4cima.com/' },
}

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

/**
 * كاش في ذاكرة الـWorker (isolate-level) — الصفحة الرئيسية تقرأ من جداول كاش
 * ثابتة تتغير مرة يومياً، فلا داعي لإعادة 10 استعلامات D1 مع كل طلب.
 * أيزلي لكل isolate وTTL قصير — يقلل زمن الاستجابة من ~ثانية إلى ~ميلي ثانية
 * لمعظم الطلبات دون أي خطر على حداثة المحتوى.
 */
const HOME_DATA_TTL_MS = 10 * 60 * 1000 // 10 دقائق

/** شكل بيانات الصفحة الرئيسية (صفوف DB خام — تُوحَّد لاحقاً بـ mapItems في الكلينت) */
/* eslint-disable @typescript-eslint/no-explicit-any */
interface HomeDataResult {
  trendingMovies: any[]
  trendingSeries: any[]
  topRatedMovies: any[]
  topRatedSeries: any[]
  action: any[]
  drama: any[]
  sciFi: any[]
  anime: any[]
  crime: any[]
  arabicMovies: any[]
}

let homeDataCache: { at: number; data: HomeDataResult } | null = null

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
 * — أقسام الصفحة الرئيسية تأتي من قوائم كاش ثابتة (~100 عنصر) تمامًا مثل الرائج.
 */
function genreQuery(movieGenreIds: number[], seriesGenreIds: number[], limit = 100): string {
  return `
    SELECT ${MOVIE_GENRE_FIELDS}
    FROM list_movies_genre l
    WHERE l.genre_tmdb_id IN (${movieGenreIds.join(',')})
    UNION ALL
    SELECT ${SERIES_GENRE_FIELDS}
    FROM list_series_genre s
    WHERE s.genre_tmdb_id IN (${seriesGenreIds.join(',')})
    LIMIT ${limit}`
}

async function getHomeData(): Promise<HomeDataResult> {
  // إرجاع النسخة المخزّنة إن كانت ما زالت صالحة
  if (homeDataCache && Date.now() - homeDataCache.at < HOME_DATA_TTL_MS) {
    return homeDataCache.data
  }
  try {
    const [movies, series, topMovies, topSeries, action, drama, sciFi, anime, crime, arabicMovies] =
      await Promise.all([
        /* 1+2) الرائج — كما هي */
        executeAll(
          `SELECT l.id, l.tmdb_id,
                  COALESCE(m.slug, l.slug) AS slug,
                  l.title_ar, l.title_en, l.poster_path, l.backdrop_path,
                  l.vote_average, printf('%04d-01-01', l.release_year) AS release_date, l.overview_ar, l.genres_json
           FROM list_movies_popular l
           LEFT JOIN movies m ON m.tmdb_id = l.tmdb_id
           ORDER BY l.rank
           LIMIT 100`,
          []
        ),
        executeAll(
          `SELECT l.id, l.tmdb_id,
                  COALESCE(t.slug, l.slug) AS slug,
                  l.name_ar AS title_ar, l.name_en AS title_en, l.poster_path, l.backdrop_path,
                  l.vote_average, printf('%04d-01-01', l.first_air_year) AS first_air_date, l.overview_ar, l.genres_json
           FROM list_series_popular l
           LEFT JOIN tv_series t ON t.tmdb_id = l.tmdb_id
           ORDER BY l.rank
           LIMIT 100`,
          []
        ),
        /* 3) الأعلى تقييمًا أفلام — من كاش top_rated */
        executeAll(
          `SELECT l.id, l.tmdb_id, l.slug,
                  l.title_ar, l.title_en, l.poster_path, l.backdrop_path,
                  l.vote_average, printf('%04d-01-01', l.release_year) AS release_date, l.overview_ar, l.genres_json
           FROM list_movies_top_rated l
           ORDER BY l.rank
           LIMIT 100`,
          []
        ),
        /* 4) الأعلى تقييمًا مسلسلات — من كاش top_rated */
        executeAll(
          `SELECT l.id, l.tmdb_id, l.slug,
                  l.name_ar AS title_ar, l.name_en AS title_en, l.poster_path, l.backdrop_path,
                  l.vote_average, printf('%04d-01-01', l.first_air_year) AS first_air_date, l.overview_ar, l.genres_json
           FROM list_series_top_rated l
           ORDER BY l.rank
           LIMIT 100`,
          []
        ),
        /* 5) الأكشن والمغامرة */
        executeAll(genreQuery([28, 12], [10759]), []),
        /* 6) الدراما والرومانسية */
        executeAll(genreQuery([18, 10749], [18, 10749]), []),
        /* 7) الخيال العلمي */
        executeAll(genreQuery([878], [10765]), []),
        /* 8) الأنمي والرسوم المتحركة */
        executeAll(genreQuery([16], [16]), []),
        /* 9) الجريمة والغموض */
        executeAll(genreQuery([80, 9648], [80, 9648]), []),
        /* 10) أفلام عربية — من جدول الأفلام مباشرة (بدون كاش جاهز) */
        executeAll(
          `SELECT 'movie' AS media_type, m.id, m.tmdb_id, m.slug,
                  m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
                  m.vote_average, m.release_year AS year, m.overview_ar, m.genres_json
           FROM movies m
           WHERE m.original_language = 'ar'
             AND (m.filter_status IN ('clean', 'reviewed_approved') OR m.filter_status IS NULL)
             AND m.slug IS NOT NULL AND m.tmdb_id IS NOT NULL
           ORDER BY m.popularity DESC
           LIMIT 100`,
          []
        ),
      ])

    const sanitize = (rows: unknown[]) => rows.map((r) => JSON.parse(JSON.stringify(r)))
    const data = {
      trendingMovies: sanitize(movies),
      trendingSeries: sanitize(series),
      topRatedMovies: sanitize(topMovies),
      topRatedSeries: sanitize(topSeries),
      action: sanitize(action),
      drama: sanitize(drama),
      sciFi: sanitize(sciFi),
      anime: sanitize(anime),
      crime: sanitize(crime),
      arabicMovies: sanitize(arabicMovies),
    }
    homeDataCache = { at: Date.now(), data }
    return data
  } catch (error) {
    console.error('Error fetching home data:', error)
    return {
      trendingMovies: [],
      trendingSeries: [],
      topRatedMovies: [],
      topRatedSeries: [],
      action: [],
      drama: [],
      sciFi: [],
      anime: [],
      crime: [],
      arabicMovies: [],
    }
  }
}

export default async function HomePage() {
  const homeData = await getHomeData()
  return <HomePageClient initialData={homeData} />
}