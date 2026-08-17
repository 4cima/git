import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GenrePageClient } from '@/components/pages/GenrePageClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/genres/${slug}?limit=1`)
    const data = await response.json()
    
    if (data.error) {
      return {
        title: 'تصنيف غير موجود | 4cima'
      }
    }
    
    const genreName = data.genre?.name_ar || 'تصنيف'
    
    return {
      title: `${genreName} | 4cima`,
      description: `استكشف أفضل أفلام ومسلسلات ${genreName} - جودة عالية ومترجم`
    }
  } catch (error) {
    return {
      title: 'تصنيف | 4cima'
    }
  }
}

export const revalidate = 3600

export default async function GenrePage({ params }: PageProps) {
  const { slug } = await params
  
  // Fetch initial data - just genre info, client will fetch content
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/genres/${slug}?type=movie&limit=1`,
      { next: { revalidate: 3600 } }
    )
    
    const data = await response.json()
    
    if (data.error) {
      notFound()
    }
    
    // Pass only genre info, client will fetch content based on selected tab
    return <GenrePageClient initialData={{ genre: data.genre, content: [], pagination: { hasMore: false } }} slug={slug} />
  } catch (error) {
    notFound()
  }
}
