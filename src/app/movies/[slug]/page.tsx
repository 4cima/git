import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst } from '@/lib/db'
import { MovieDetailsClient } from '@/components/pages/MovieDetailsClient'
import { truncateDescription } from '@/utils/textSanitizer'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const movie = await executeFirst(
    'SELECT title_ar, title_en, overview_ar, seo_title_ar, seo_description_ar, seo_keywords_json, poster_path, backdrop_path FROM movies WHERE slug = ? LIMIT 1',
    [slug]
  )
  // العمل غير موجود → 404 فعلي (كان يُرجع { title: 'فيلم غير موجود' } مع HTTP 200 — سبب الـ soft 404)
  if (!movie) notFound()

  // تفادي تكرار اسم الموقع داخل العنوان (القالب في layout.tsx يضيف «| فور سيما | 4cima»)
  const stripBrand = (s: unknown): string =>
    String(s ?? '')
      .replace(/فور\s*سيما/gi, '')
      .replace(/^[\s\-–—|·:]+/, '')
      .replace(/[\s\-–—|·:]+$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

  const nameAr = stripBrand(movie.title_ar || movie.title_en) || 'فيلم'
  const nameEn = stripBrand(movie.title_en)
  const title = nameEn && nameEn !== nameAr ? `فيلم ${nameAr} | ${nameEn}` : `فيلم ${nameAr}`
  const description = truncateDescription(String(
    (movie.seo_description_ar && String(movie.seo_description_ar).trim()) || 
    movie.overview_ar || 
    'شاهد الفيلم على فور سيما'
    )
)
  
  let keywords: string | undefined
  try {
    if (movie.seo_keywords_json) {
      const keywordsArray = typeof movie.seo_keywords_json === 'string' 
        ? JSON.parse(movie.seo_keywords_json) 
        : movie.seo_keywords_json
      if (Array.isArray(keywordsArray) && keywordsArray.length > 0) {
        keywords = keywordsArray.join(', ')
      }
    }
  } catch {}
  
  // og:image: خلفية 16:9 إن توفّرت (أقرب مقاس متاح من TMDB لـ 1200×630 هو w1280 بـ 1280×720)،
  // وإلا الملصق، وإلا صورة الموقع العامة — الصور عبر بروكسي /tmdb/ وليس image.tmdb.org مباشرة
  const ogImage = movie.backdrop_path
    ? { url: `https://4cima.com/tmdb/w1280${movie.backdrop_path}`, width: 1280, height: 720, alt: title }
    : movie.poster_path
      ? { url: `https://4cima.com/tmdb/w500${movie.poster_path}`, width: 500, height: 750, alt: title }
      : { url: 'https://4cima.com/og-image.png', width: 1200, height: 630, alt: 'فور سيما' }
  const pageUrl = `https://4cima.com/movies/${slug}`

  return {
    title,
    description,
    keywords,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'video.movie' as const,
      url: pageUrl,
      title,
      description,
      siteName: 'فور سيما',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [ogImage.url],
    },
  }
}

export default async function MovieDetails({ params }: PageProps) {
  const { slug }    = await params
  const movieData   = await executeFirst('SELECT * FROM movies WHERE slug = ? LIMIT 1', [slug])
  if (!movieData) notFound()
  const movie       = JSON.parse(JSON.stringify(movieData))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name:            movie.title_ar || movie.title_en || 'فيلم',
    alternateName:   movie.title_en || undefined,
    description:     movie.overview_ar || movie.overview || undefined,
    image:           movie.poster_path ? `https://4cima.com/tmdb/w500${movie.poster_path}` : undefined,
    datePublished:   movie.release_date || undefined,
    genre:           (() => {
      try {
        return movie.genres_json ? JSON.parse(String(movie.genres_json)).map((g: any) => g.name_ar || g.name_en) : undefined
      } catch {
        return undefined
      }
    })(),
    inLanguage:      movie.original_language || 'ar',
    url:             `https://4cima.com/movies/${slug}`,
    aggregateRating: movie.vote_average ? {
      '@type': 'AggregateRating', ratingValue: movie.vote_average,
      ratingCount: movie.vote_count || 0, bestRating: 10, worstRating: 0
    } : undefined
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
      { '@type': 'ListItem', position: 2, name: 'أفلام', item: 'https://4cima.com/movies' },
      { '@type': 'ListItem', position: 3, name: movie.title_ar || movie.title_en || 'فيلم', item: `https://4cima.com/movies/${slug}` },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <MovieDetailsClient movie={movie} />
    </>
  )
}
