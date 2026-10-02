import type { Metadata } from 'next'

const desc = 'سياسة حقوق النشر الرقمية (DMCA) على فور سيما: الموقع لا يستضيف أي محتوى فيديو — وخطوات الإبلاغ وطلب الإزالة عبر dmca@4cima.com.'

export const metadata: Metadata = {
  title: 'DMCA - سياسة حقوق النشر الرقمية',
  description: desc,
  alternates: { canonical: 'https://4cima.com/dmca' },
  openGraph: { title: 'DMCA - سياسة حقوق النشر الرقمية | فور سيما', description: desc, url: 'https://4cima.com/dmca' },
  twitter: { title: 'DMCA - سياسة حقوق النشر الرقمية | فور سيما', description: desc },
}

export default function DMCA_layout({ children }: { children: React.ReactNode }) { return children }
