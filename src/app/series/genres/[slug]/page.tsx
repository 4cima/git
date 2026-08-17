import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { turso } from '@/lib/turso'
import { SeriesGenrePageClient } from '@/components/pages/SeriesGenrePageClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  
  try {
    const response = await turso.execute({
      sql: 'SELECT * FROM genres WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!response.rows || response.rows.length === 0) {
      return {
        title: 'تصنيف غير موجود | 4cima'
      }
    }
    
    const genre = response.rows[0]
    const genreName = genre.name_ar || genre.name_en || 'تصنيف'
    
    return {
      title: `مسلسلات ${genreName} | 4cima`,
      description: `استكشف أفضل مسلسلات ${genreName} - جودة عالية ومترجم`
    }
  } catch (error) {
    return {
      title: 'تصنيف | 4cima'
    }
  }
}

export const revalidate = 3600

export default async function SeriesGenrePage({ params }: PageProps) {
  const { slug } = await params
  
  try {
    // Fetch genre info
    const genreResult = await turso.execute({
      sql: 'SELECT * FROM genres WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!genreResult.rows || genreResult.rows.length === 0) {
      notFound()
    }
    
    const genre = genreResult.rows[0]
    
    return <SeriesGenrePageClient genre={genre} slug={slug} />
  } catch (error) {
    notFound()
  }
}
