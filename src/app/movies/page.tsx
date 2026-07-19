import { Metadata } from 'next'
import { MoviesPageClient } from '@/components/pages/MoviesPageClient'

export const metadata: Metadata = {
  title: 'أفلام | فور سيما',
  description: 'استكشف آلاف الأفلام المترجمة بجودة عالية - أفلام أكشن، كوميديا، دراما، رعب، وأكثر',
}

export const revalidate = 300

export default function MoviesPage() {
  return <MoviesPageClient />
}
