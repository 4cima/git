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
    description: description.slice(0, 160),
    alternates: {
      canonical: `https://4cima.com/series/${slug}`
    }
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
  
  // Parse seasons from JSON column (stored in tv_series table)
  const seasonsJson = seriesData.seasons_json
  let seasons = []
  
  try {
    seasons = seasonsJson ? JSON.parse(String(seasonsJson)) : []
  } catch (e) {
    console.error('Error parsing seasons_json:', e)
    seasons = []
  }
  
  // If no seasons data, create a default season 1
  if (!seasons || seasons.length === 0) {
    seasons = [{
      season_number: 1,
      name_en: 'Season 1',
      name_ar: 'الموسم 1',
      episode_count: seriesData.number_of_episodes || 10,
      air_date: seriesData.first_air_date,
      poster_path: null
    }]
  }
  
  // Convert to plain objects
  const series = JSON.parse(JSON.stringify(seriesData))
  
  return <SeriesDetailsClient series={series} seasons={seasons} />
}

