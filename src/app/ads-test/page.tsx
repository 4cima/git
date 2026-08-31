import { Metadata } from 'next'
import { AdsTestPage } from '@/components/pages/AdsTestPage'

export const metadata: Metadata = {
  title: 'صفحة تجربة الإعلانات | فور سيما',
  description: 'صفحة تجربة لاختبار جميع مخططات الإعلانات',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdsTest() {
  return <AdsTestPage />
}