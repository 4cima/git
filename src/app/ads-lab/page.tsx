import AdsLabPage from '@/components/pages/AdsLabPage'

export const metadata = {
  title: 'مختبر ترتيب الإعلانات | 4cima',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return <AdsLabPage />
}
