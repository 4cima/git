import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { SeriesPageClient } from '@/components/pages/SeriesPageClient'

export const metadata: Metadata = {
  title: 'المسلسلات المترجمة',
  description: 'استكشف آلاف المسلسلات المترجمة بجودة عالية - دراما، أكشن، كوميديا، وأكثر',
  keywords: ['مسلسلات', 'مسلسلات مترجمة', 'مشاهدة مسلسلات أونلاين', 'مسلسلات 2025', 'مسلسلات تركية', 'مسلسلات كورية', 'مسلسلات أجنبية', '4cima'],
  alternates: { canonical: 'https://4cima.com/series' },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: 'https://4cima.com/series',
    siteName: '4cima',
    title: 'المسلسلات المترجمة | فور سيما',
    description: 'استكشف آلاف المسلسلات المترجمة بجودة عالية - دراما، أكشن، كوميديا، وأكثر',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'المسلسلات المترجمة',
      },
    ],
  },
}

export const dynamic    = 'force-dynamic' // D1 not available at build time on CI

async function getInitialSeries() {
  try {
    /* المنطق الموحد: الدفعة الأولى 20 عملًا (نجلب 21 لنعرف هل يوجد المزيد) */
    const rows = await executeAll(
      `SELECT id, slug, name_ar, name_en, poster_path, vote_average,
              printf('%04d-01-01', first_air_year) AS first_air_date, genres_json
       FROM list_series_popular
       ORDER BY rank
       LIMIT ${LISTING_PAGE_SIZE + 1}`,
      []
    )
    const filtered = filterExcludedGenres(rows)
    const hasMore = filtered.length > LISTING_PAGE_SIZE
    if (hasMore) filtered.pop()
    return { items: filtered, hasMore }
  } catch (error) {
    console.error('Error fetching initial series:', error)
    return { items: [], hasMore: false }
  }
}

export default async function SeriesPage() {
  const { items: initialSeries, hasMore: initialHasMore } = await getInitialSeries()

  // Structured data — helps search engines understand the catalog listing
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'المسلسلات المترجمة',
    numberOfItems: initialSeries.length,
    itemListElement: initialSeries.slice(0, 20).map((s: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://4cima.com/series/${s.slug}`,
      name: s.name_ar || s.name_en,
      image: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : undefined,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SeriesPageClient initialSeries={initialSeries} initialHasMore={initialHasMore} />
    </>
  )
}
