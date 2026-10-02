import type { Metadata } from 'next'

const desc = 'سياسة خصوصية فور سيما: ما نجمعه من بيانات (الحساب، الكوكيز، الإحصاءات المجهولة) وكيف نستخدمه ونحميه.'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية',
  description: desc,
  alternates: { canonical: 'https://4cima.com/privacy' },
  openGraph: { title: 'سياسة الخصوصية | فور سيما', description: desc, url: 'https://4cima.com/privacy' },
  twitter: { title: 'سياسة الخصوصية | فور سيما', description: desc },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) { return children }
