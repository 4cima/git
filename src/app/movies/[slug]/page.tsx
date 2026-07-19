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
    description: description.slice(0, 160)
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
  
  return <MovieDetailsClient movie={movie} />
}

