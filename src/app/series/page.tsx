import { Metadata } from 'next'
import { CategoryHub } from '@/components/pages/CategoryHub'

export const metadata: Metadata = {
  title: 'مسلسلات | فور سيما',
  description: 'استكشف أفضل المسلسلات على فور سيما - جودة عالية ومترجم',
}

export default function SeriesPage() {
  return <CategoryHub type="tv" />
}
