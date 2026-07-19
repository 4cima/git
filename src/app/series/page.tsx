import { Metadata } from 'next'
import { SeriesPageClient } from '@/components/pages/SeriesPageClient'

export const metadata: Metadata = {
  title: 'مسلسلات | فور سيما',
  description: 'استكشف آلاف المسلسلات المترجمة بجودة عالية - دراما، أكشن، كوميديا، وأكثر',
}

export const revalidate = 300

export default function SeriesPage() {
  return <SeriesPageClient />
}
