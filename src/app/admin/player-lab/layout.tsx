import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'معمل اختبار السيرفرات',
  robots: { index: false, follow: false },
}

export default function PlayerLabLayout({ children }: { children: React.ReactNode }) {
  return children
}