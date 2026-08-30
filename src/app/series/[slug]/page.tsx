import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst } from '@/lib/db'
import { SeriesDetailsClient } from '@/components/pages/SeriesDetailsClient'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug }  = await params
  const series    = await executeFirst(
    'SELECT name_ar, name_en, overview_ar, seo_title_ar, seo_description_ar, seo_keywords_json FROM tv_series WHERE slug = ? LIMIT 1', [slug]
  )
  if (!series) return { title: 'مسلسل غير موجود | فور سيما' }
  
  const title = String(
    (series.seo_title_ar && String(series.seo_title_ar).trim()) || 
    series.name_ar || 
    series.name_en || 
    'مسلسل'
  )
  const description = String(
    (series.seo_description_ar && String(series.seo_description_ar).trim()) || 
    series.overview_ar || 
    'شاهد المسلسل على فور سيما'
  ).slice(0, 160)
  
  let keywords: string | undefined
  try {
    if (series.seo_keywords_json) {
      const keywordsArray = typeof series.seo_keywords_json === 'string' 
        ? JSON.parse(series.seo_keywords_json) 
        : series.seo_keywords_json
      if (Array.isArray(keywordsArray) && keywordsArray.length > 0) {
        keywords = keywordsArray.join(', ')
      }
    }
  } catch {}
  
  const posterImage = series.poster_path
    ? `https://image.tmdb.org/t/p/w500${series.poster_path}`
    : undefined
  const pageUrl = `https://4cima.com/series/${slug}`

  return {
    title: `${title} | فور سيما`,
    description,
    keywords,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'video.tv_show' as const,
      url: pageUrl,
      title,
      description,
      siteName: 'فور سيما',
      images: posterImage ? [{ url: posterImage, width: 500, height: 750, alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: posterImage ? [posterImage] : undefined,
    },
  }
}

export default async function SeriesDetails({ params }: PageProps) {
  const { slug }   = await params
  const seriesData = await executeFirst('SELECT * FROM tv_series WHERE slug = ? LIMIT 1', [slug])
  if (!seriesData) notFound()

  let seasons: any[] = []
  try {
    seasons = seriesData.seasons_json ? JSON.parse(String(seriesData.seasons_json)) : []
  } catch { seasons = [] }

  if (!seasons || seasons.length === 0) {
    seasons = [{
      season_number: 1, name_en: 'Season 1', name_ar: 'الموسم 1',
      episode_count: seriesData.number_of_episodes || 10,
      air_date: seriesData.first_air_date, poster_path: null
    }]
  }

  const series = JSON.parse(JSON.stringify(seriesData))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name:             series.name_ar || series.name_en || 'مسلسل',
    alternateName:    series.name_en || undefined,
    description:      series.overview_ar || series.overview || undefined,
    image:            series.poster_path ? `https://4cima.com/tmdb/w500${series.poster_path}` : undefined,
    datePublished:    series.first_air_date || undefined,
    genre:            series.genres_json ? JSON.parse(String(series.genres_json)).map((g: any) => g.name_ar || g.name_en) : undefined,
    inLanguage:       series.original_language || 'ar',
    numberOfSeasons:  series.number_of_seasons || seasons.length,
    numberOfEpisodes: series.number_of_episodes || undefined,
    url:              `https://4cima.com/series/${slug}`,
    aggregateRating:  series.vote_average ? {
      '@type': 'AggregateRating', ratingValue: series.vote_average,
      ratingCount: series.vote_count || 0, bestRating: 10, worstRating: 0
    } : undefined
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
      { '@type': 'ListItem', position: 2, name: 'مسلسلات', item: 'https://4cima.com/series' },
      { '@type': 'ListItem', position: 3, name: series.name_ar || series.name_en || 'مسلسل', item: `https://4cima.com/series/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <SeriesDetailsClient series={series} seasons={seasons} />
    </>
  )
}
