import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { SeriesPageClient } from '@/components/pages/SeriesPageClient'

export const metadata: Metadata = {
  title: 'مسلسلات | فور سيما',
  description: 'استكشف آلاف المسلسلات المترجمة بجودة عالية - دراما، أكشن، كوميديا، وأكثر',
  alternates: { canonical: 'https://4cima.com/series' }
}

export const dynamic    = 'force-dynamic'
export const revalidate = 0

async function getInitialSeries() {
  const rows = await executeAll(
    `SELECT id, slug, name_ar, name_en, poster_path, vote_average, first_air_year, genres_json
     FROM tv_series
     WHERE filter_status = 'clean'
     ORDER BY popularity DESC
     LIMIT 50`,
    []
  )
  return rows.map(row => JSON.parse(JSON.stringify(row)))
}

export default async function SeriesPage() {
  const initialSeries = await getInitialSeries()
  return <SeriesPageClient initialSeries={initialSeries} />
}
