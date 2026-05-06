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
    sql: 'SELECT name_ar, name_en, overview_ar, overview FROM series WHERE slug = ? LIMIT 1',
    args: [slug]
  })
  
  const series = result.rows?.[0]
  
  if (!series) {
    return {
      title: 'مسلسل غير موجود | فور سيما'
    }
  }
  
  const title = series.name_ar || series.name_en || 'مسلسل'
  const description = series.overview_ar || series.overview || 'شاهد المسلسل على فور سيما'
  
  return {
    title: `${title} | فور سيما`,
    description: description.slice(0, 160)
  }
}

export default async function SeriesDetails({ params }: PageProps) {
  const { slug } = await params
  
  const result = await turso.execute({
    sql: 'SELECT * FROM series WHERE slug = ? LIMIT 1',
    args: [slug]
  })
  
  const series = result.rows?.[0]
  
  if (!series) {
    notFound()
  }
  
  // Fetch seasons
  const seasonsResult = await turso.execute({
    sql: 'SELECT * FROM seasons WHERE series_id = ? ORDER BY season_number ASC',
    args: [series.id]
  })
  
  return <SeriesDetailsClient series={series} seasons={seasonsResult.rows || []} />
}

