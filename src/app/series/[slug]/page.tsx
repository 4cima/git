import { Metadata } from 'next'
import { SeriesDetailsPage } from '@/components/pages/SeriesDetailsPage'
import { generateContentMetadata } from '@/lib/seo-helpers'

// دالة جلب بيانات المسلسل (يجب تعديلها حسب API الخاص بك)
async function getSeriesBySlug(slug: string) {
  // TODO: استبدل هذا بـ API call الفعلي
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tv/${slug}`, {
    next: { revalidate: 3600 } // Cache لمدة ساعة
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch series')
  }
  
  return response.json()
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  
  try {
    const series = await getSeriesBySlug(slug)
    return generateContentMetadata(series)
  } catch (error) {
    // Fallback metadata في حالة الخطأ
    return {
      title: 'مسلسل | 4cima',
      description: 'مشاهدة المسلسل مترجم بجودة عالية',
    }
  }
}

export default async function SeriesDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <SeriesDetailsPage slug={slug} />
}

