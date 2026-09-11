import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MoviesPageClient } from '@/components/pages/MoviesPageClient'
import { findNavLanguage } from '@/lib/language-nav'

interface PageProps {
  params: Promise<{ code: string }>
}

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const lang = findNavLanguage(code)
  if (!lang) return { title: 'قسم غير موجود' }

  const title = `أفلام ${lang.label}`
  const url = `https://4cima.com/movies/lang/${code}`
  return {
    title,
    description: `شاهد أفضل الأفلام ${lang.label} بجودة عالية ومترجمة`,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'ar_EG',
      url,
      siteName: '4cima',
      title: `${title} | فور سيما`,
      description: `شاهد أفضل الأفلام ${lang.label} بجودة عالية ومترجمة`,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
  }
}

/**
 * صفحة قسم لغة: /movies/lang/[code]
 * allowlist = لغات الـ Navbar المشتركة (مع findNavLanguage — يوافق بـ filter ثم code).
 * أي كود غير مسموح → 404. لا generateStaticParams ولا revalidate — القائمة ديناميكية من D1.
 */
export default async function MovieLangPage({ params }: PageProps) {
  const { code } = await params
  const lang = findNavLanguage(code)
  if (!lang) notFound()

  return <MoviesPageClient forcedLanguage={lang.filter} title={`أفلام ${lang.label}`} />
}