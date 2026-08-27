import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'معمل السيرفرات',
  robots: { index: false, follow: false },
}

export default function PlayerTestLayout({ children }: { children: React.ReactNode }) {
  return children
}