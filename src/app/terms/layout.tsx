import type { Metadata } from 'next'

const desc = 'شروط استخدام فور سيما: قواعد الاستخدام، الحسابات، المحتوى المعروض، وحدود المسؤولية.'

export const metadata: Metadata = {
  title: 'الشروط والأحكام',
  description: desc,
  alternates: { canonical: 'https://4cima.com/terms' },
  openGraph: { title: 'الشروط والأحكام | فور سيما', description: desc, url: 'https://4cima.com/terms' },
  twitter: { title: 'الشروط والأحكام | فور سيما', description: desc },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) { return children }
