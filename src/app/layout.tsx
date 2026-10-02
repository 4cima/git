import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { QuantumNavbar } from '@/components/layout/QuantumNavbar'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ClientInit } from './ClientInit'
import { GlobalAdsV2 } from '@/components/features/system/adsV2'
import { safeJsonLd } from '@/lib/jsonld';

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

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'فور سيما',
  alternateName: '4cima',
  url: 'https://4cima.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://4cima.com/og-image.png',
    width: 1200,
    height: 630,
  },
  sameAs: [
    'https://www.facebook.com/4cima2',
  ],
}

const cairo = Cairo({ 
  subsets: ['arabic', 'latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://4cima.com'),
  title: {
    default: 'فور سيما | مشاهدة أفلام ومسلسلات مترجمة أون لاين',
    template: '%s | فور سيما | 4cima',
  },
  description: 'شاهد أحدث الأفلام والمسلسلات المترجمة أون لاين على فور سيما — وصف عربي، تريلرات، وتقييمات لكل عمل.',
  keywords: [
    'افلام',
    'مسلسلات',
    'مشاهدة اون لاين',
    'افلام مترجمة',
    'مسلسلات مترجمة',
    'افلام اجنبية',
    'دراما كورية',
    'مسلسلات تركية',
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
    siteName: 'فور سيما',
    title: 'فور سيما | مشاهدة أفلام ومسلسلات مترجمة أون لاين',
    description: 'شاهد أحدث الأفلام والمسلسلات المترجمة أون لاين على فور سيما — وصف عربي، تريلرات، وتقييمات لكل عمل.',
    images: [
      {
        url: 'https://4cima.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'فور سيما — شاهد أحدث الأفلام والمسلسلات المترجمة',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'فور سيما | مشاهدة أفلام ومسلسلات مترجمة أون لاين',
    description: 'شاهد أحدث الأفلام والمسلسلات المترجمة أون لاين على فور سيما.',
    images: ['https://4cima.com/og-image.png'],
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
    // HilltopAds site ownership (publisher site 920428) — المفتاح مخصص
    // فيتطلب other{} (قائمة VerificationKeys البيضاء في Next)
    other: {
      'ed43f0389f279ed220d81c1d1f75b259f60bf72f':
        'ed43f0389f279ed220d81c1d1f75b259f60bf72f',
    },
    // TODO: أضف كود التحقق من Google Search Console
    // google: 'YOUR_GOOGLE_VERIFICATION_CODE',
  },
  // Monetag publisher verification متأجَّلة (INP/LCP) — كانت تُرسم كـ
  // <meta name="monetag" content="3e29c37aa4e9905e68def8c15741a614" />
  // في أول الـ <head> — تُعاد بعد أول رسمة/تفاعل عبر ClientInit إن لزم.
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <head>
        {/* لا preconnect/dns-prefetch لدومينات الإعلانات إطلاقًا — اتصالات
            الشبكات الإعلانية تُفتح ضمنيًا فقط عند تحميل وحدات adsV2 المؤجلة
            (src/config/adsV2.ts) أو عند تفعيل طابور الضغطات من زر المشاهدة
            (src/lib/ads/waterfall.ts). لا يُحمَّل أي سكربت إعلان عند الإقلاع
            أو أول سكرول. */}
      </head>
      <body className={`${cairo.className} bg-black text-white min-h-screen`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
        />
        <AuthProvider>
          <ClientInit />
          <GlobalAdsV2 />
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
