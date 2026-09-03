import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { SeriesPageClient } from '@/components/pages/SeriesPageClient'

export const metadata: Metadata = {
  title: 'المسلسلات المترجمة',
  description: 'استكشف آلاف المسلسلات المترجمة بجودة عالية - دراما، أكشن، كوميديا، وأكثر',
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
    const rows = await executeAll(
      `SELECT id, slug, name_ar, name_en, poster_path, vote_average,
              printf('%04d-01-01', first_air_year) AS first_air_date, genres_json
       FROM list_series_popular
       ORDER BY rank
       LIMIT 50`,
      []
    )
    return rows.map(row => JSON.parse(JSON.stringify(row)))
  } catch (error) {
    console.error('Error fetching initial series:', error)
    return []
  }
}

export default async function SeriesPage() {
  const initialSeries = await getInitialSeries()
  return <SeriesPageClient initialSeries={initialSeries} />
}
