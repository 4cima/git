import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { MoviesPageClient } from '@/components/pages/MoviesPageClient'

export const metadata: Metadata = {
  title: 'الأفلام المترجمة',
  description: 'استكشف آلاف الأفلام المترجمة بجودة عالية - أفلام أكشن، كوميديا، دراما، رعب، وأكثر',
  keywords: ['أفلام', 'أفلام مترجمة', 'مشاهدة أفلام أونلاين', 'أفلام 2025', 'أفلام أكشن', 'أفلام كوميديا', 'أفلام أجنبية', '4cima'],
  alternates: { canonical: 'https://4cima.com/movies' },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: 'https://4cima.com/movies',
    siteName: '4cima',
    title: 'الأفلام المترجمة | فور سيما',
    description: 'استكشف آلاف الأفلام المترجمة بجودة عالية - أفلام أكشن، كوميديا، دراما، رعب، وأكثر',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'الأفلام المترجمة',
      },
    ],
  },
}

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

async function getInitialMovies() {
  try {
    /* المنطق الموحد: الدفعة الأولى 20 عملًا (نجلب 21 لنعرف هل يوجد المزيد) */
    const rows = await executeAll(
      `SELECT id, slug, title_ar, title_en, poster_path, vote_average, 
              printf('%04d-01-01', release_year) AS release_date, genres_json
       FROM list_movies_popular
       ORDER BY rank
       LIMIT ${LISTING_PAGE_SIZE + 1}`,
      []
    )
    const filtered = filterExcludedGenres(rows)
    const hasMore = filtered.length > LISTING_PAGE_SIZE
    if (hasMore) filtered.pop()
    return { items: filtered, hasMore }
  } catch (error) {
    console.error('Error fetching initial movies:', error)
    return { items: [], hasMore: false }
  }
}

export default async function MoviesPage() {
  const { items: initialMovies, hasMore: initialHasMore } = await getInitialMovies()

  // Structured data — helps search engines understand the catalog listing
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'الأفلام المترجمة',
    numberOfItems: initialMovies.length,
    itemListElement: initialMovies.slice(0, 20).map((m: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://4cima.com/movies/${m.slug}`,
      name: m.title_ar || m.title_en,
      image: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : undefined,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MoviesPageClient initialMovies={initialMovies} initialHasMore={initialHasMore} />
    </>
  )
}
