import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst } from '@/lib/db'
import { MovieDetailsClient } from '@/components/pages/MovieDetailsClient'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const movie = await executeFirst(
    'SELECT title_ar, title_en, overview_ar, seo_title_ar, seo_description_ar, seo_keywords_json FROM movies WHERE slug = ? LIMIT 1',
    [slug]
  )
  if (!movie) return { title: 'فيلم غير موجود | فور سيما' }
  
  const title = String(
    (movie.seo_title_ar && String(movie.seo_title_ar).trim()) || 
    movie.title_ar || 
    movie.title_en || 
    'فيلم'
  )
  const description = String(
    (movie.seo_description_ar && String(movie.seo_description_ar).trim()) || 
    movie.overview_ar || 
    'شاهد الفيلم على فور سيما'
  ).slice(0, 160)
  
  let keywords: string | undefined
  try {
    if (movie.seo_keywords_json) {
      const keywordsArray = typeof movie.seo_keywords_json === 'string' 
        ? JSON.parse(movie.seo_keywords_json) 
        : movie.seo_keywords_json
      if (Array.isArray(keywordsArray) && keywordsArray.length > 0) {
        keywords = keywordsArray.join(', ')
      }
    }
  } catch {}
  
  const posterImage = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : undefined
  const pageUrl = `https://4cima.com/movies/${slug}`

  return {
    title: `${title} | فور سيما`,
    description,
    keywords,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'video.movie' as const,
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

export default async function MovieDetails({ params }: PageProps) {
  const { slug }    = await params
  const movieData   = await executeFirst('SELECT * FROM movies WHERE slug = ? LIMIT 1', [slug])
  if (!movieData) notFound()
  const movie       = JSON.parse(JSON.stringify(movieData))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name:            movie.title_ar || movie.title_en || 'فيلم',
    alternateName:   movie.title_en || undefined,
    description:     movie.overview_ar || movie.overview || undefined,
    image:           movie.poster_path ? `https://4cima.com/tmdb/w500${movie.poster_path}` : undefined,
    datePublished:   movie.release_date || undefined,
    genre:           movie.genres_json ? JSON.parse(String(movie.genres_json)).map((g: any) => g.name_ar || g.name_en) : undefined,
    inLanguage:      movie.original_language || 'ar',
    url:             `https://4cima.com/movies/${slug}`,
    aggregateRating: movie.vote_average ? {
      '@type': 'AggregateRating', ratingValue: movie.vote_average,
      ratingCount: movie.vote_count || 0, bestRating: 10, worstRating: 0
    } : undefined
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
      { '@type': 'ListItem', position: 2, name: 'أفلام', item: 'https://4cima.com/movies' },
      { '@type': 'ListItem', position: 3, name: movie.title_ar || movie.title_en || 'فيلم', item: `https://4cima.com/movies/${slug}` },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <MovieDetailsClient movie={movie} />
    </>
  )
}
