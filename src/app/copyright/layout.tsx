import type { Metadata } from 'next'

const desc = 'موقف فور سيما من حقوق النشر والملكية الفكرية، وآلية تقديم طلب إزالة المحتوى المخالف.'

export const metadata: Metadata = {
  title: 'حقوق النشر والملكية الفكرية',
  description: desc,
  alternates: { canonical: 'https://4cima.com/copyright' },
  openGraph: { title: 'حقوق النشر والملكية الفكرية | فور سيما', description: desc, url: 'https://4cima.com/copyright' },
  twitter: { title: 'حقوق النشر والملكية الفكرية | فور سيما', description: desc },
}

export default function CopyrightLayout({ children }: { children: React.ReactNode }) { return children }
