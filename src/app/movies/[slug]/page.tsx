import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst } from '@/lib/db'
import { getSimilarMovies } from '@/lib/similar-server'
import { MovieDetailsClient } from '@/components/pages/MovieDetailsClient'
import { safeJsonLd } from '@/lib/jsonld';

// ساعة بدل دقيقة: كاش الحافة (edge-cache-worker) بيغطي الزيارات، وده بيقلل إعادة التوليد من D1
// 60 مرة. التحديثات بعد المزامنة بتوصل فورًا عبر purge_everything في سلسلة ما بعد المزامنة.
export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const movie = await executeFirst(
    `SELECT title_ar, title_en, overview_ar, seo_title_ar, seo_description_ar, seo_keywords_json, poster_path, backdrop_path, release_year, genres_json
     FROM movies
     WHERE slug = ?
       AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
     AND release_year IS NOT NULL AND release_year >= 2000
     LIMIT 1`,
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

  // القاعدة الجديدة (Max 60 حرف) — suffix بـ 11 حرف بدل 19 من قالب layout
  // يُعاد عبر { absolute } لتجاوز قالب layout («%s | فور سيما | 4cima») ومنع تكرار العلامة
  const suffix = ' | فور سيما'
  const brandPrefix = 'فيلم'
  const base = `${brandPrefix} ${nameAr}`
  const enPart = nameEn && nameEn !== nameAr ? ` | ${nameEn}` : ''

  // جرّب العنوان الكامل
  let title = `${base}${enPart}${suffix}`

  // لو طويل: شيل الجزء الإنجليزي
  if (title.length > 60) {
    title = `${base}${suffix}`
  }

  // لو لسه طويل: اقتطع الاسم العربي
  if (title.length > 60) {
    const maxBase = 60 - suffix.length - brandPrefix.length - 2 // -2 للنقاط
    const truncated = nameAr.slice(0, maxBase).trim()
    title = `${brandPrefix} ${truncated}…${suffix}`
  }

  // الوصف: أول تصنيفين عربيين من genres_json + سنة الإصدار كبادئة قبل النص الأساسي
  let genres: string[] = []
  try {
    const parsed = movie.genres_json ? JSON.parse(String(movie.genres_json)) : []
    if (Array.isArray(parsed)) {
      genres = parsed.map((g: any) => g?.name_ar || g?.name_en).filter(Boolean).slice(0, 2)
    }
  } catch {}

  const prefixParts: string[] = []
  if (genres.length) prefixParts.push(genres.join(' · '))
  if (movie.release_year) prefixParts.push(String(movie.release_year))
  const prefix = prefixParts.length ? `${prefixParts.join(' · ')} — ` : ''

  const baseDesc = String(
    (movie.seo_description_ar && String(movie.seo_description_ar).trim()) ||
    movie.overview_ar ||
    'شاهد على فور سيما'
  ).trim().replace(/\s+/g, ' ')

  let description = prefix + baseDesc
  if (description.length > 158) {
    description = description.slice(0, 155).trim() + '…'
  }
  
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
    title: { absolute: title },
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
  /* بوابة الإخفاء: المحجوب (blocked) → 404 نظيف بلا JSON-LD ولا بيانات صفحة */
  const movieData   = await executeFirst(
    `SELECT * FROM movies
     WHERE slug = ?
       AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
     AND release_year IS NOT NULL AND release_year >= 2000
     LIMIT 1`,
    [slug]
  )
  if (!movieData) notFound()
  const movie       = JSON.parse(JSON.stringify(movieData))

  /* «قد يعجبك أيضاً» — SSR من جداول similar-cache (~15 صفًا بالـPK بدل ~145K في
     نداء الـAPI القديم) — الروابط تظهر في HTML أولي يجعل 86K صفحة التفاصيل
     شبكة مترابطة بدل صفحات يتيمة (علاج Discovered - currently not indexed). */
  const initialSimilar = await getSimilarMovies(Number(movieData.tmdb_id))

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
  const videoJsonLd = {
    '@context':    'https://schema.org',
    '@type':       'VideoObject',
    name:          `فيلم ${movie.title_ar || movie.title_en}`,
    description:   (movie.overview_ar || '').slice(0, 200),
    thumbnailUrl:  movie.backdrop_path
      ? `https://4cima.com/tmdb/w1280${movie.backdrop_path}`
      : (movie.poster_path ? `https://4cima.com/tmdb/w500${movie.poster_path}` : 'https://4cima.com/og-image.png'),
    uploadDate:    movie.release_date || '2000-01-01',
    duration:      movie.runtime ? `PT${movie.runtime}M` : undefined,
    contentUrl:    `https://4cima.com/movies/${movie.slug}`,
    embedUrl:      `https://4cima.com/movies/${movie.slug}`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(videoJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <MovieDetailsClient movie={movie} initialSimilar={initialSimilar} />
    </>
  )
}
