import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { QuantumNavbar } from '@/components/layout/QuantumNavbar'
import { Footer } from '@/components/layout/Footer'
import { Toaster } from 'sonner'

const cairo = Cairo({ 
  subsets: ['arabic', 'latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://4cima.online'),
  title: {
    default: '4cima - مشاهدة افلام ومسلسلات مترجمة اون لاين بجودة عالية',
    template: '%s | 4cima',
  },
  description: 'مشاهدة وتحميل احدث الافلام والمسلسلات المترجمة والمدبلجة بجودة عالية HD و 4K مجاناً. افلام اجنبية، مسلسلات تركية، دراما كورية، وأكثر.',
  keywords: [
    'افلام',
    'مسلسلات',
    'مشاهدة اون لاين',
    'تحميل افلام',
    'افلام مترجمة',
    'مسلسلات مترجمة',
    'افلام اجنبية',
    'دراما كورية',
    'مسلسلات تركية',
    'افلام HD',
    'مشاهدة بدون اعلانات',
  ],
  authors: [{ name: '4cima' }],
  creator: '4cima',
  publisher: '4cima',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://4cima.online',
    siteName: '4cima',
    title: '4cima - مشاهدة افلام ومسلسلات مترجمة',
    description: 'مشاهدة وتحميل احدث الافلام والمسلسلات المترجمة بجودة عالية HD مجاناً',
    images: [
      {
        url: '/public/logo.svg',
        width: 1200,
        height: 630,
        alt: '4cima',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '4cima - مشاهدة افلام ومسلسلات',
    description: 'مشاهدة وتحميل احدث الافلام والمسلسلات المترجمة',
    images: ['/public/logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // TODO: أضف كود التحقق من Google Search Console
    // google: 'YOUR_GOOGLE_VERIFICATION_CODE',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <body className={`${cairo.className} bg-black text-white min-h-screen`}>
        <Providers>
          <QuantumNavbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  )
}
