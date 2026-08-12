import { Metadata } from 'next'
import { turso } from '@/lib/turso'
import { SeriesPageClient } from '@/components/pages/SeriesPageClient'

export const metadata: Metadata = {
  title: 'مسلسلات | فور سيما',
  description: 'استكشف آلاف المسلسلات المترجمة بجودة عالية - دراما، أكشن، كوميديا، وأكثر',
}

export const revalidate = false // Will use cache tags instead

async function getInitialSeries() {
  const result = await turso.execute({
    sql: `SELECT id, slug, name_ar, name_en, poster_path, vote_average, first_air_year, genres_json 
          FROM tv_series 
          WHERE filter_status = 'approved' 
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  
  return result.rows.map(row => JSON.parse(JSON.stringify(row)))
}

export default async function SeriesPage() {
  const initialSeries = await getInitialSeries()
  
  return <SeriesPageClient initialSeries={initialSeries} />
}
