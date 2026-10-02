import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst } from '@/lib/db'
import { getSimilarSeries } from '@/lib/similar-server'
import { SeriesDetailsClient } from '@/components/pages/SeriesDetailsClient'
import { safeJsonLd } from '@/lib/jsonld';
import { buildDetailsTitle, cleanOverviewText, truncateDescription } from '@/lib/details-seo'

// ساعة بدل دقيقة: كاش الحافة (edge-cache-worker) بيغطي الزيارات، وده بيقلل إعادة التوليد من D1
// 60 مرة. التحديثات بعد المزامنة بتوصل فورًا عبر purge_everything في سلسلة ما بعد المزامنة.
export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug }  = await params
  const series    = await executeFirst(
    `SELECT name_ar, name_en, overview_ar, seo_title_ar, seo_description_ar, seo_keywords_json, poster_path, backdrop_path, first_air_year, genres_json, vote_count, trailer_key
     FROM tv_series
     WHERE slug = ?
       AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
     AND first_air_year IS NOT NULL AND first_air_year >= 2000
     LIMIT 1`, [slug]
  )
  // العمل غير موجود → 404 فعلي (كان يُرجع { title: 'مسلسل غير موجود' } مع HTTP 200 — سبب الـ soft 404)
  if (!series) notFound()

  // بوابة الضعف (قرار 4 — 2/10/2026): صف بلا تريلر وتقييمه من أقل من 50 صوت
  // = هزيل لجوجل → noindex,follow (الصفحة تظل ظاهرة للزائر) — نفس بوابة سايت ماب.
  const isThin =
    Number(series.vote_count || 0) < 50 &&
    !(series.trailer_key && String(series.trailer_key).trim() !== '')

  // تفادي تكرار اسم الموقع داخل العنوان (يُعاد { absolute } لتجاوز قالب layout)
  const stripBrand = (s: unknown): string =>
    String(s ?? '')
      .replace(/فور\s*سيما/gi, '')
      .replace(/^[\s\-–—|·:]+/, '')
      .replace(/[\s\-–—|·:]+$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

  const nameAr = stripBrand(series.name_ar || series.name_en) || 'مسلسل'
  const nameEn = stripBrand(series.name_en)

  // القالب الجديد (بند 4): «مسلسل {عربي} ({سنة}) {إنجليزي} – المواسم والحلقات والأبطال | فور سيما»
  const title = buildDetailsTitle({
    typePrefix: 'مسلسل',
    nameAr,
    nameEn,
    year: series.first_air_year,
    intent: ' – المواسم والحلقات والأبطال',
  })

  // التصنيفات للقالب الاحتياطي للوصف
  let genres: string[] = []
  try {
    const parsed = series.genres_json ? JSON.parse(String(series.genres_json)) : []
    if (Array.isArray(parsed)) {
      genres = parsed.map((g: any) => g?.name_ar || g?.name_en).filter(Boolean).slice(0, 2)
    }
  } catch {}

  // القالب الجديد (بند 3): الوصف يبدأ بالقصة ويُقتطع عند حد جملة/كلمة،
  // وقالب احتياطي فريد من بيانات حقيقية لو مفيش قصة
  const overview = cleanOverviewText(series.overview_ar || series.overview)
  const fallbackDesc = `مسلسل ${nameAr}${series.first_air_year ? ` (${series.first_air_year})` : ''}${nameEn ? ` «${nameEn}»` : ''} — ${genres.join('، ') || 'عمل تلفزيوني'} من مسلسلات فور سيما.`
  const description = truncateDescription(overview || fallbackDesc)
  
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
  // وإلا الملصق، وإلا صورة الموقع العامة — الصور عبر بروكسي /img/ (مسار عام محايد) وليس image.tmdb.org مباشرة
  const ogImage = series.backdrop_path
    ? { url: `https://4cima.com/img/w1280${series.backdrop_path}`, width: 1280, height: 720, alt: title }
    : series.poster_path
      ? { url: `https://4cima.com/img/w500${series.poster_path}`, width: 500, height: 750, alt: title }
      : { url: 'https://4cima.com/og-image.png', width: 1200, height: 630, alt: 'فور سيما' }
  const pageUrl = `https://4cima.com/series/${slug}`

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: pageUrl },
    // الصفحات الهزيلة فقط تتخطى الفهرسة (noindex,follow) — الباقي يرث الافتراضي من layout
    ...(isThin ? { robots: { index: false as const, follow: true as const } } : {}),
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
    image:            series.poster_path ? `https://4cima.com/img/w500${series.poster_path}` : undefined,
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
    // بوابة التقييم: لا يُصدَّر aggregateRating إلا مع 50 صوتًا فأكثر (يمنع تقييمات غير موثوقة مثل 10/10 بصوت واحد)
    aggregateRating:  series.vote_average && (series.vote_count || 0) >= 50 ? {
      '@type': 'AggregateRating', ratingValue: series.vote_average,
      ratingCount: series.vote_count || 0, bestRating: 10, worstRating: 0
    } : undefined
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <SeriesDetailsClient series={series} seasons={seasons} initialSimilar={initialSimilar} />
    </>
  )
}
