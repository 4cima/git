import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { HomePageClient } from '@/components/pages/HomePageClient'

export const metadata: Metadata = {
  title: 'فور سيما | شاهد أحدث الأفلام والمسلسلات المترجمة',
  description:
    'موقع فور سيما لمشاهدة أحدث الأفلام والمسلسلات المترجمة بجودة عالية - أكشن، دراما، كوميديا، رعب، وأكثر. الرائج، خيال علمي، أنمي، جريمة، وأفلام ومسلسلات عربية.',
  keywords: [
    'افلام',
    'مسلسلات',
    'افلام اجنبي',
    'مسلسلات اجنبي',
    'افلام عربي',
    'مسلسلات عربي',
    'انمي',
    'مترجم',
    'اون لاين',
  ],
  alternates: { canonical: 'https://4cima.com/' },
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: 'https://4cima.com/',
    siteName: 'فور سيما',
    title: 'فور سيما | شاهد أحدث الأفلام والمسلسلات المترجمة',
    description: 'مشاهدة أحدث الأفلام والمسلسلات المترجمة بجودة عالية — الرائج والأقسام المختلطة (أفلام + مسلسلات).',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'فور سيما | شاهد أحدث الأفلام والمسلسلات المترجمة',
    description: 'مشاهدة أحدث الأفلام والمسلسلات المترجمة بجودة عالية على فور سيما.',
  },
}

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

/**
 * كاش في ذاكرة الـWorker (isolate-level) — الصفحة الرئيسية تقرأ من جداول كاش
 * ثابتة تتغير مرة يومياً، فلا داعي لإعادة 10 استعلامات D1 مع كل طلب.
 * أيزلي لكل isolate وTTL قصير — يقلل زمن الاستجابة من ~ثانية إلى ~ميلي ثانية
 * لمعظم الطلبات دون أي خطر على حداثة المحتوى.
 */
const HOME_DATA_TTL_MS = 30 * 60 * 1000 // 30 دقيقة (الجداول تتغير مرة يومياً)

/** أقل سنة مسموح بها في أقسام الصفحة الرئيسية — لا يُعرض أبداً عمل أقدم من 10 سنوات */
const MIN_YEAR = new Date().getFullYear() - 10

/** شكل بيانات الصفحة الرئيسية (صفوف DB خام — تُوحَّد لاحقاً بـ mapItems في الكلينت) */
/* eslint-disable @typescript-eslint/no-explicit-any */
interface HomeDataResult {
  trendingMovies: any[]
  trendingSeries: any[]
}

let homeDataCache: { at: number; data: HomeDataResult } | null = null

async function getHomeData(): Promise<HomeDataResult> {
  // إرجاع النسخة المخزّنة إن كانت ما زالت صالحة
  if (homeDataCache && Date.now() - homeDataCache.at < HOME_DATA_TTL_MS) {
    return homeDataCache.data
  }
  try {
    const [movies, series] =
      await Promise.all([
        /* 1+2) الرائج — آخر 10 سنوات فقط، 60 لكل نوع */
        executeAll(
          `SELECT l.id, l.tmdb_id,
                  COALESCE(m.slug, l.slug) AS slug,
                  l.title_ar, l.title_en, l.poster_path, l.backdrop_path,
                  l.vote_average, printf('%04d-01-01', l.release_year) AS release_date, l.overview_ar, l.genres_json
           FROM list_movies_popular l
           LEFT JOIN movies m ON m.tmdb_id = l.tmdb_id
           WHERE l.release_year >= ${MIN_YEAR}
           ORDER BY l.rank
           LIMIT 60`,
          []
        ),
        executeAll(
          `SELECT l.id, l.tmdb_id,
                  COALESCE(t.slug, l.slug) AS slug,
                  l.name_ar AS title_ar, l.name_en AS title_en, l.poster_path, l.backdrop_path,
                  l.vote_average, printf('%04d-01-01', l.first_air_year) AS first_air_date, l.overview_ar, l.genres_json
           FROM list_series_popular l
           LEFT JOIN tv_series t ON t.tmdb_id = l.tmdb_id
           WHERE l.first_air_year >= ${MIN_YEAR}
           ORDER BY l.rank
           LIMIT 60`,
          []
        ),
        /* 3..7) الأقسام الإضافية (خيال علمي، أنمي، جريمة، عربي) انتقلت إلى
           /api/home-sections — تُحمَّل من الكلاينت بعد أول رسم لتخفيف HTML الرئيسي */
      ])

    const sanitize = (rows: unknown[]) => rows.map((r) => JSON.parse(JSON.stringify(r)))
    // فلتر مركزي: يستبعد Talk Show + War & Politics + Documentary + History
    // من كل أقسام الصفحة الرئيسية (الرائج + التصنيفات + العربية)
    const data = {
      trendingMovies: filterExcludedGenres(sanitize(movies)),
      trendingSeries: filterExcludedGenres(sanitize(series)),
    }
    homeDataCache = { at: Date.now(), data }
    return data
  } catch (error) {
    console.error('Error fetching home data:', error)
    return {
      trendingMovies: [],
      trendingSeries: [],
    }
  }
}

/** JSON-LD — قائمة أقوى 12 عمل رائج (SEO: ItemList بمُعرّفات ورابط لكل عنصر) */
function buildHomeJsonLd(data: HomeDataResult) {
  const movies = (data.trendingMovies || []).slice(0, 6)
  const series = (data.trendingSeries || []).slice(0, 6)
  const items = [
    ...movies.map((m) => ({ name: m.title_ar || m.title_en, type: 'Movie', slug: m.slug, year: m.release_date?.substring(0, 4) })),
    ...series.map((s) => ({ name: s.title_ar || s.title_en, type: 'TVSeries', slug: s.slug, year: s.first_air_date?.substring(0, 4) })),
  ].filter((i) => i.slug)

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'الأفلام والمسلسلات الرائجة على فور سيما',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: items.length,
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `https://4cima.com/${item.type === 'Movie' ? 'movies' : 'series'}/${item.slug}`,
      name: item.name,
    })),
  }
}

export default async function HomePage() {
  const homeData = await getHomeData()
  const jsonLd = buildHomeJsonLd(homeData)
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient initialData={homeData} />
    </>
  )
}