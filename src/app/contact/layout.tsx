import type { Metadata } from 'next'

const desc = 'تواصل مع فور سيما: أرسل اقتراحك أو شكواك أو ملاحظتك على المحتوى — كل الرسائل بتتقّرى.'

export const metadata: Metadata = {
  title: 'الاقتراحات والشكاوى',
  description: desc,
  alternates: { canonical: 'https://4cima.com/contact' },
  openGraph: { title: 'الاقتراحات والشكاوى | فور سيما', description: desc, url: 'https://4cima.com/contact' },
  twitter: { title: 'الاقتراحات والشكاوى | فور سيما', description: desc },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) { return children }
