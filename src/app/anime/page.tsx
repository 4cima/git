import { Metadata } from 'next'
import { CategoryHub } from '@/components/pages/CategoryHub'

export const metadata: Metadata = {
  title: 'أنمي | فور سيما',
  description: 'استكشف أفضل الأنمي على فور سيما - جودة عالية ومترجم',
}

export default function AnimePage() {
  return <CategoryHub type="movie" category="anime" />
}
