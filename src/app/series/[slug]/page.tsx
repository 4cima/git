import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst } from '@/lib/db'
import { getSimilarSeries } from '@/lib/similar-server'
import { SeriesDetailsClient } from '@/components/pages/SeriesDetailsClient'

// ساعة بدل دقيقة: كاش الحافة (edge-cache-worker) بيغطي الزيارات، وده بيقلل إعادة التوليد من D1
// 60 مرة. التحديثات بعد المزامنة بتوصل فورًا عبر purge_everything في سلسلة ما بعد المزامنة.
export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug }  = await params
  const series    = await executeFirst(
    `SELECT name_ar, name_en, overview_ar, seo_title_ar, seo_description_ar, seo_keywords_json, poster_path, backdrop_path, first_air_year, genres_json
     FROM tv_series
     WHERE slug = ?
       AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
     AND first_air_year IS NOT NULL AND first_air_year >= 2000
     LIMIT 1`, [slug]
  )
  // العمل غير موجود → 404 فعلي (كان يُرجع { title: 'مسلسل غير موجود' } مع HTTP 200 — سبب الـ soft 404)
  if (!series) notFound()

  // تفادي تكرار اسم الموقع داخل العنوان (القالب في layout.tsx يضيف «| فور سيما | 4cima»)
  const stripBrand = (s: unknown): string =>
    String(s ?? '')
      .replace(/فور\s*سيما/gi, '')
      .replace(/^[\s\-–—|·:]+/, '')
      .replace(/[\s\-–—|·:]+$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

  const nameAr = stripBrand(series.name_ar || series.name_en) || 'مسلسل'
  const nameEn = stripBrand(series.name_en)

  // القاعدة الجديدة (Max 60 حرف) — suffix بـ 11 حرف بدل 19 من قالب layout
  // يُعاد عبر { absolute } لتجاوز قالب layout («%s | فور سيما | 4cima») ومنع تكرار العلامة
  const suffix = ' | فور سيما'
  const brandPrefix = 'مسلسل'
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

  // الوصف: أول تصنيفين عربيين من genres_json + سنة أول عرض كبادئة قبل النص الأساسي
  let genres: string[] = []
  try {
    const parsed = series.genres_json ? JSON.parse(String(series.genres_json)) : []
    if (Array.isArray(parsed)) {
      genres = parsed.map((g: any) => g?.name_ar || g?.name_en).filter(Boolean).slice(0, 2)
    }
  } catch {}

  const prefixParts: string[] = []
  if (genres.length) prefixParts.push(genres.join(' · '))
  if (series.first_air_year) prefixParts.push(String(series.first_air_year))
  const prefix = prefixParts.length ? `${prefixParts.join(' · ')} — ` : ''

  const baseDesc = String(
    (series.seo_description_ar && String(series.seo_description_ar).trim()) ||
    series.overview_ar ||
    'شاهد على فور سيما'
  ).trim().replace(/\s+/g, ' ')

  let description = prefix + baseDesc
  if (description.length > 158) {
    description = description.slice(0, 155).trim() + '…'
  }
  
  let keywords: string | undefined
  try {
    if (series.seo_keywords_json) {
      const keywordsArray = typeof series.seo_keywords_json === 'string' 
        ? JSON.parse(series.seo_keywords_json) 
        : series.seo_keywords_json
      if (Array.isArray(keywordsArray) && keywordsArray.length > 0) {
        keywords = keywordsArray.join(', ')
      }
    }
  } catch {}
  
  // og:image: خلفية 16:9 إن توفّرت (أقرب مقاس متاح من TMDB لـ 1200×630 هو w1280 بـ 1280×720)،
  // وإلا الملصق، وإلا صورة الموقع العامة — الصور عبر بروكسي /tmdb/ وليس image.tmdb.org مباشرة
  const ogImage = series.backdrop_path
    ? { url: `https://4cima.com/tmdb/w1280${series.backdrop_path}`, width: 1280, height: 720, alt: title }
    : series.poster_path
      ? { url: `https://4cima.com/tmdb/w500${series.poster_path}`, width: 500, height: 750, alt: title }
      : { url: 'https://4cima.com/og-image.png', width: 1200, height: 630, alt: 'فور سيما' }
  const pageUrl = `https://4cima.com/series/${slug}`

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'video.tv_show' as const,
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

export default async function SeriesDetails({ params }: PageProps) {
  const { slug }   = await params
  /* بوابة الإخفاء: المحجوب (blocked) → 404 نظيف بلا JSON-LD ولا بيانات صفحة */
  const seriesData = await executeFirst(
    `SELECT * FROM tv_series
     WHERE slug = ?
       AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
     AND first_air_year IS NOT NULL AND first_air_year >= 2000
     LIMIT 1`,
    [slug]
  )
  if (!seriesData) notFound()

  let seasons: any[] = []
  try {
    seasons = seriesData.seasons_json ? JSON.parse(String(seriesData.seasons_json)) : []
  } catch { seasons = [] }

  if (!seasons || seasons.length === 0) {
    seasons = [{
      season_number: 1, name_en: 'Season 1', name_ar: 'الموسم 1',
      episode_count: seriesData.number_of_episodes || 10,
      air_date: seriesData.first_air_date, poster_path: null
    }]
  }

  const series = JSON.parse(JSON.stringify(seriesData))

  /* «قد يعجبك أيضاً» — SSR من series_similar_cache (~15 صفًا بالـPK بدل نداء
     الـAPI القديم ثقيل القراءة) — روابط داخلية حقيقية في HTML أولي. */
  const initialSimilar = await getSimilarSeries(Number(seriesData.tmdb_id))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name:             series.name_ar || series.name_en || 'مسلسل',
    alternateName:    series.name_en || undefined,
    description:      series.overview_ar || series.overview || undefined,
    image:            series.poster_path ? `https://4cima.com/tmdb/w500${series.poster_path}` : undefined,
    datePublished:    series.first_air_date || undefined,
    genre:            (() => {
      try {
        return series.genres_json ? JSON.parse(String(series.genres_json)).map((g: any) => g.name_ar || g.name_en) : undefined
      } catch {
        return undefined
      }
    })(),
    inLanguage:       series.original_language || 'ar',
    numberOfSeasons:  series.number_of_seasons || seasons.length,
    numberOfEpisodes: series.number_of_episodes || undefined,
    url:              `https://4cima.com/series/${slug}`,
    aggregateRating:  series.vote_average ? {
      '@type': 'AggregateRating', ratingValue: series.vote_average,
      ratingCount: series.vote_count || 0, bestRating: 10, worstRating: 0
    } : undefined
  }
  const videoJsonLd = {
    '@context':      'https://schema.org',
    '@type':         'VideoObject',
    name:            `مسلسل ${series.name_ar || series.name_en}`,
    description:     (series.overview_ar || '').slice(0, 200),
    thumbnailUrl:    series.backdrop_path
      ? `https://4cima.com/tmdb/w1280${series.backdrop_path}`
      : (series.poster_path ? `https://4cima.com/tmdb/w500${series.poster_path}` : 'https://4cima.com/og-image.png'),
    uploadDate:      series.first_air_date || '2000-01-01',
    duration:        undefined,
    contentUrl:      `https://4cima.com/series/${series.slug}`,
    embedUrl:        `https://4cima.com/series/${series.slug}`,
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
      { '@type': 'ListItem', position: 2, name: 'مسلسلات', item: 'https://4cima.com/series' },
      { '@type': 'ListItem', position: 3, name: series.name_ar || series.name_en || 'مسلسل', item: `https://4cima.com/series/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <SeriesDetailsClient series={series} seasons={seasons} initialSimilar={initialSimilar} />
    </>
  )
}
