import { Metadata } from 'next'
import { CategoryHub } from '@/components/pages/CategoryHub'

export const metadata: Metadata = {
  title: 'أنمي',
  description: 'استكشف أفضل الأنمي على فور سيما - جودة عالية ومترجم',
  alternates: { canonical: 'https://4cima.com/anime' },
  openGraph: {
    type: 'website',
    url: 'https://4cima.com/anime',
    title: 'أنمي',
    description: 'استكشف أفضل الأنمي على فور سيما - جودة عالية ومترجم',
    siteName: 'فور سيما',
  },
}

export default function AnimePage() {
  return <CategoryHub type="movie" category="anime" allowTypeSwitch />
}
