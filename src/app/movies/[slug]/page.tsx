import { Metadata } from 'next'
import { MovieDetailsPage } from '@/components/pages/MovieDetailsPage'
import { generateContentMetadata } from '@/lib/seo-helpers'

// دالة جلب بيانات الفيلم (يجب تعديلها حسب API الخاص بك)
async function getMovieBySlug(slug: string) {
  // TODO: استبدل هذا بـ API call الفعلي
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies/${slug}`, {
    next: { revalidate: 3600 } // Cache لمدة ساعة
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch movie')
  }
  
  return response.json()
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  
  try {
    const movie = await getMovieBySlug(slug)
    return generateContentMetadata(movie)
  } catch (error) {
    // Fallback metadata في حالة الخطأ
    return {
      title: 'فيلم | 4cima',
      description: 'مشاهدة الفيلم مترجم بجودة عالية',
    }
  }
}

export default async function MovieDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <MovieDetailsPage slug={slug} />
}

