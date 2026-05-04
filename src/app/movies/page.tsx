import { Metadata } from 'next'
import { CategoryHub } from '@/components/pages/CategoryHub'

export const metadata: Metadata = {
  title: 'أفلام | فور سيما',
  description: 'استكشف أفضل الأفلام على فور سيما - جودة عالية ومترجم',
}

export default function MoviesPage() {
  return <CategoryHub type="movie" />
}
