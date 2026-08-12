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
  
  // Build JSON-LD structured data for TVSeries schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: series.name_ar || series.name_en || 'مسلسل',
    alternateName: series.name_en || undefined,
    description: series.overview_ar || series.overview || undefined,
    image: series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : undefined,
    datePublished: series.first_air_date || undefined,
    genre: series.genres_json ? JSON.parse(String(series.genres_json)).map((g: any) => g.name_ar || g.name_en) : undefined,
    inLanguage: series.original_language || 'ar',
    numberOfSeasons: series.number_of_seasons || seasons.length,
    numberOfEpisodes: series.number_of_episodes || undefined,
    aggregateRating: series.vote_average ? {
      '@type': 'AggregateRating',
      ratingValue: series.vote_average,
      ratingCount: series.vote_count || 0,
      bestRating: 10,
      worstRating: 0
    } : undefined
  }
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SeriesDetailsClient series={series} seasons={seasons} />
    </>
  )
}

