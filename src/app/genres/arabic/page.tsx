import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { GenreOverviewPageClient } from '@/components/pages/GenreOverviewPageClient'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const metadata: Metadata = {
  // بدون «| فور سيما» — template في layout يضيفها تلقائياً
  title: 'أفلام ومسلسلات عربي — تصفح كامل القسم',
  description:
    'استكشف أفضل الأفلام والمسلسلات العربية المترجمة بجودة عالية — مقسّمة لقسمين: الأفلام العربية والمسلسلات العربية مع ترتيب حسب الشهرة.',
  keywords: [
    'أفلام عربية', 'مسلسلات عربية', 'أفلام عربي', 'مسلسلات عربي',
    'أفلام مصرية', 'مسلسلات رمضان', 'تصنيف عربي', '4cima',
  ],
  alternates: { canonical: 'https://4cima.com/genres/arabic' },
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  openGraph: {
    title: 'أفلام ومسلسلات عربي — تصفح كامل القسم | فور سيما',
    description:
      'استكشف أفضل الأفلام والمسلسلات العربية المترجمة بجودة عالية — مقسّمة لقسمين: الأفلام العربية والمسلسلات العربية.',
    url: 'https://4cima.com/genres/arabic',
    siteName: 'فور سيما',
    type: 'website',
    locale: 'ar_EG',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'أفلام ومسلسلات عربي' }],
  },
}

export const revalidate = 3600

/** صفحة القسم المختلط «عربي» — لغة (original_language = 'ar') لا تصنيف TMDB.
 *  بوابتان: أفلام عربي (/movies/arabic) ومسلسلات عربي (/series/arabic). */
export default async function ArabicOverviewPage() {
  try {
    const [topMovies, topSeries] = await Promise.all([
      executeAll(
        `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, vote_average, release_year, overview_ar, genres_json
         FROM movies
         WHERE original_language = 'ar'
           AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
           AND slug IS NOT NULL AND tmdb_id IS NOT NULL
           AND poster_path IS NOT NULL
         ORDER BY popularity DESC LIMIT 12`,
        []
      ),
      executeAll(
        `SELECT id, tmdb_id, slug, name_ar as title_ar, name_en as title_en, poster_path, vote_average, first_air_year as release_year, overview_ar, genres_json
         FROM tv_series
         WHERE original_language = 'ar'
           AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
           AND slug IS NOT NULL AND tmdb_id IS NOT NULL
           AND poster_path IS NOT NULL
         ORDER BY popularity DESC LIMIT 12`,
        []
      ),
    ])

    // فلتر مركزي: Talk Show + War & Politics + Documentary + History
    const filteredMovies = filterExcludedGenres(topMovies)
    const filteredSeries = filterExcludedGenres(topSeries)

    /* JSON-LD — Breadcrumb + CollectionPage بكل الأعمال الظاهرة (SEO) */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
            { '@type': 'ListItem', position: 2, name: 'التصنيفات', item: 'https://4cima.com/genres' },
            { '@type': 'ListItem', position: 3, name: 'عربي', item: 'https://4cima.com/genres/arabic' },
          ],
        },
        {
          '@type': 'CollectionPage',
          name: 'أفلام ومسلسلات عربي',
          url: 'https://4cima.com/genres/arabic',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: filteredMovies.length + filteredSeries.length,
            itemListElement: [
              ...filteredMovies.slice(0, 10).map((m: any, i: number) => ({
                '@type': 'ListItem', position: i + 1,
                url: `https://4cima.com/movies/${m.slug}`,
                name: m.title_ar || m.title_en,
              })),
              ...filteredSeries.slice(0, 10).map((s: any, i: number) => ({
                '@type': 'ListItem', position: filteredMovies.slice(0, 10).length + i + 1,
                url: `https://4cima.com/series/${s.slug}`,
                name: s.title_ar || s.title_en,
              })),
            ],
          },
        },
      ],
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <GenreOverviewPageClient
          genre={{ id: 0, tmdb_id: 0, name_en: 'Arabic', name_ar: 'عربي', slug: 'arabic' }}
          slug="arabic"
          topMovies={filteredMovies}
          topSeries={filteredSeries}
          moviesHref="/movies/arabic"
          seriesHref="/series/arabic"
        />
      </>
    )
  } catch {
    return (
      <GenreOverviewPageClient
        genre={{ id: 0, tmdb_id: 0, name_en: 'Arabic', name_ar: 'عربي', slug: 'arabic' }}
        slug="arabic"
        topMovies={[]}
        topSeries={[]}
        moviesHref="/movies/arabic"
        seriesHref="/series/arabic"
      />
    )
  }
}