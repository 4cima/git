import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { turso } from '@/lib/turso'
import { SeriesDetailsClient } from '@/components/pages/SeriesDetailsClient'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  
  const result = await turso.execute({
    sql: 'SELECT name_ar, name_en, overview_ar FROM tv_series WHERE slug = ? LIMIT 1',
    args: [slug]
  })
  
  const series = result.rows?.[0]
  
  if (!series) {
    return {
      title: 'مسلسل غير موجود | فور سيما'
    }
  }
  
  const title = String(series.name_ar || series.name_en || 'مسلسل')
  const description = String(series.overview_ar || 'شاهد المسلسل على فور سيما')
  
  return {
    title: `${title} | فور سيما`,
    description: description.slice(0, 160)
  }
}

export default async function SeriesDetails({ params }: PageProps) {
  const { slug } = await params
  
  const result = await turso.execute({
    sql: 'SELECT * FROM tv_series WHERE slug = ? LIMIT 1',
    args: [slug]
  })
  
  const seriesData = result.rows?.[0]
  
  if (!seriesData) {
    notFound()
  }
  
  // Fetch seasons
  const seasonsResult = await turso.execute({
    sql: 'SELECT * FROM tv_seasons WHERE tv_series_id = ? ORDER BY season_number ASC',
    args: [seriesData.id]
  })
  
  // Convert to plain objects
  const series = JSON.parse(JSON.stringify(seriesData))
  const seasons = JSON.parse(JSON.stringify(seasonsResult.rows || []))
  
  return <SeriesDetailsClient series={series} seasons={seasons} />
}

