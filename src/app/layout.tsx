import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { QuantumNavbar } from '@/components/layout/QuantumNavbar'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ClientInit } from './ClientInit'

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'فور سيما',
  alternateName: '4cima',
  url: 'https://4cima.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://4cima.com/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

const cairo = Cairo({ 
  subsets: ['arabic', 'latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://4cima.com'),
  title: {
    default: 'فور سيما - مشاهدة افلام ومسلسلات مترجمة اون لاين بجودة عالية',
    template: '%s | فور سيما | 4cima',
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
  icons: {
    icon: [
      { url: '/icons/favicon.svg?v=5', type: 'image/svg+xml' },
      { url: '/icons/favicon-32x32.png?v=5', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon.ico?v=5', sizes: 'any' },
    ],
    shortcut: '/icons/favicon.ico?v=5',
    apple: '/icons/apple-touch-icon.png?v=5',
  },
  manifest: '/manifest.webmanifest',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://4cima.com',
    siteName: '4cima',
    title: '4cima - مشاهدة افلام ومسلسلات مترجمة',
    description: 'مشاهدة وتحميل احدث الافلام والمسلسلات المترجمة بجودة عالية HD مجاناً',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '4cima — شاهد أحدث الأفلام والمسلسلات المترجمة',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '4cima - مشاهدة افلام ومسلسلات مترجمة',
    description: 'مشاهدة وتحميل احدث الافلام والمسلسلات المترجمة بجودة عالية HD مجاناً',
    images: ['/og-image.png'],
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
  // Monetag publisher verification — renders as:
  // <meta name="monetag" content="3e29c37aa4e9905e68def8c15741a614" />
  // in the <head> of every page (global layout => all routes).
  other: {
    monetag: '3e29c37aa4e9905e68def8c15741a614',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <head>
        {/* تسريع تحميل الإعلانات: فتح الاتصال بسيرفر Adsterra مبكرًا
            (كل زونات Adsterra تستخدم نفس الدومين) — يوفر ~100-300ms على أول إعلان */}
        <link rel="preconnect" href="https://professionalsusceptible.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://professionalsusceptible.com" />
      </head>
      <body className={`${cairo.className} bg-black text-white min-h-screen`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <AuthProvider>
          <ClientInit />
          <Providers>
            <QuantumNavbar />
            <main className="min-h-screen">
              {children}
            </main>
            <Toaster position="top-center" richColors />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}
