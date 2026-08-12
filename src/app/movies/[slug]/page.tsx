import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { turso } from '@/lib/turso'
import { MovieDetailsClient } from '@/components/pages/MovieDetailsClient'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  
  const result = await turso.execute({
    sql: 'SELECT title_ar, title_en, overview_ar FROM movies WHERE slug = ? LIMIT 1',
    args: [slug]
  })
  
  const movie = result.rows?.[0]
  
  if (!movie) {
    return {
      title: 'فيلم غير موجود | فور سيما'
    }
  }
  
  const title = String(movie.title_ar || movie.title_en || 'فيلم')
  const description = String(movie.overview_ar || 'شاهد الفيلم على فور سيما')
  
  return {
    title: `${title} | فور سيما`,
    description: description.slice(0, 160),
    alternates: {
      canonical: `https://4cima.com/movies/${slug}`
    }
  }
}

export default async function MovieDetails({ params }: PageProps) {
  const { slug } = await params
  
  const result = await turso.execute({
    sql: 'SELECT * FROM movies WHERE slug = ? LIMIT 1',
    args: [slug]
  })
  
  const movieData = result.rows?.[0]
  
  if (!movieData) {
    notFound()
  }
  
  // Convert to plain object
  const movie = JSON.parse(JSON.stringify(movieData))
  
  // Build JSON-LD structured data for Movie schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title_ar || movie.title_en || 'فيلم',
    alternateName: movie.title_en || undefined,
    description: movie.overview_ar || movie.overview || undefined,
    image: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
    datePublished: movie.release_date || undefined,
    genre: movie.genres_json ? JSON.parse(String(movie.genres_json)).map((g: any) => g.name_ar || g.name_en) : undefined,
    inLanguage: movie.original_language || 'ar',
    aggregateRating: movie.vote_average ? {
      '@type': 'AggregateRating',
      ratingValue: movie.vote_average,
      ratingCount: movie.vote_count || 0,
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
      <MovieDetailsClient movie={movie} />
    </>
  )
}

